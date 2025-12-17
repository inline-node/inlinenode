// src/engine/extractData.js
// Strict-mode extractor with header detection + warnings.
// No signal reconstruction. No partial rows.

export default function extractData(rows, columns) {
  const warnings = [];
  const errors = [];

  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    return {
      ok: false,
      errors: ["Invalid input: rows and columns must be arrays."],
      warnings,
    };
  }

  /* ------------------------------------------------------------
     1) HEADER DETECTION
     We infer column identities from the DataInput columns array.
     User may import CSV/XLSX with Y/X/X1/X2 headers.
  ------------------------------------------------------------ */

  const colKeys = columns.map((c) => c.key.trim());
  const lowerKeys = colKeys.map((k) => k.toLowerCase());

  // Detect Y column (prefer explicit "y")
  let yKey = null;
  const yIndex = lowerKeys.indexOf("y");
  if (yIndex >= 0) {
    yKey = colKeys[yIndex];
  } else {
    yKey = colKeys[0]; // fallback: first column is Y
    warnings.push("No explicit 'Y' column found. Using first column as Y.");
  }

  // Detect X columns (keys starting with X, X1, X2, etc.)
  // Detect X columns by position (preserve table order)
  let xKeys;
  if (yIndex >= 0) {
    xKeys = colKeys.filter((_, i) => i !== yIndex);
  } else {
    // fallback: first column is Y
    xKeys = colKeys.slice(1);
  }

  if (xKeys.length === 0) {
    warnings.push("No X columns found. At least one X column is required.");
    return { ok: false, errors: ["No X columns detected."], warnings };
  }

  //sanity check
  xKeys.forEach((k) => {
    if (!/^x\d*$/i.test(k) && k.toLowerCase() !== "x") {
      warnings.push(`Column '${k}' is not a standard X column name.`);
    }
  });

  /* ------------------------------------------------------------
     2) NUMERIC PARSER
  ------------------------------------------------------------ */
  const parseNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const s = ("" + v).trim();
    if (s === "") return NaN;
    const num = parseFloat(s.replace(",", "."));
    return Number.isFinite(num) ? num : NaN;
  };

  /* ------------------------------------------------------------
     3) STRICT ROW PROCESSING
     A row is accepted only if Y and ALL Xs are valid numbers.
     Otherwise: warn + skip.
  ------------------------------------------------------------ */

  const Y = [];
  const Xcols = xKeys.map(() => []);
  const rowsIndexMap = [];

  rows.forEach((row, idx) => {
    if (!row || typeof row !== "object") return;

    const yVal = parseNum(row[yKey]);
    if (!Number.isFinite(yVal)) {
      warnings.push(`Skipping row ${idx}: invalid Y value '${row[yKey]}'`);
      return;
    }

    const xVals = xKeys.map((k) => parseNum(row[k]));
    const allXValid = xVals.every((n) => Number.isFinite(n));

    if (!allXValid) {
      warnings.push(
        `Skipping row ${idx}: one or more X values are invalid (${JSON.stringify(
          row
        )})`
      );
      return;
    }

    // Accept row:
    Y.push(yVal);
    xVals.forEach((v, i) => Xcols[i].push(v));
    rowsIndexMap.push(idx);
  });

  if (Y.length === 0) {
    errors.push("No valid numeric rows found after parsing.");
    return { ok: false, errors, warnings };
  }

  /* ------------------------------------------------------------
     4) VERIFY CONSISTENCY
  ------------------------------------------------------------ */
  const n = Y.length;
  const lengthsOK = Xcols.every((col) => col.length === n);

  if (!lengthsOK) {
    errors.push("X-column length mismatch after strict filtering.");
    return { ok: false, errors, warnings };
  }

  /* ------------------------------------------------------------
     5) FINAL RETURN SHAPE
  ------------------------------------------------------------ */
  return {
    ok: true,
    errors,
    warnings,
    y: Y,
    x: Xcols,
    xKeys,
    yKey,
    rowsIndexMap,
    isMultivariable: Xcols.length > 1,
  };
}
