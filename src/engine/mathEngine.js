// src/engine/mathEngine.js
// Multiple-linear support for Linear model (normal equations).
// Polite messages for models that don't support multivariable yet.

import extractData from "./extractData";

/* ------------------------------------------------------------
   Basic helpers
------------------------------------------------------------ */
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const r2Score = (y, yPred) => {
  const ym = mean(y);
  const ssTot = y.reduce((acc, yi) => acc + (yi - ym) ** 2, 0);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - yPred[i]) ** 2, 0);
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
};

const rmse = (residuals) =>
  Math.sqrt(residuals.reduce((acc, r) => acc + r * r, 0) / residuals.length);

/* safe log */
function safeLog(v, fnName = "log") {
  if (typeof v !== "number" || !isFinite(v)) return NaN;
  if (v <= 0) return NaN;
  return fnName === "ln"
    ? Math.log(v)
    : fnName === "log2"
    ? Math.log2(v)
    : Math.log10(v);
}

/* ------------------------------------------------------------
   Gaussian elimination for normal equations
------------------------------------------------------------ */
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) return null;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    const pivot = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const f = M[r][i];
        for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
      }
    }
  }

  return M.map((row) => row[n]);
}

/* ------------------------------------------------------------
   LINEAR (single or multiple X columns)
   - If single X column: behave exactly as before (m, c).
   - If multiple X columns: perform multiple linear regression.
------------------------------------------------------------ */
function linearFit(data) {
  const { y, x, xKeys } = data;

  // if no X provided, cannot run linear (should be caught earlier)
  if (!x || x.length === 0)
    return { ok: false, error: "No X columns provided for linear regression." };

  const n = y.length;

  // Single-variable path (keep same outputs for backward compatibility)
  if (x.length === 1) {
    const X = x[0];
    const mx = mean(X);
    const my = mean(y);

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (X[i] - mx) * (y[i] - my);
      den += (X[i] - mx) ** 2;
    }
    if (den === 0) return { ok: false, error: "Cannot compute slope." };

    const m = num / den;
    const c = my - m * mx;

    const yPred = X.map((xi) => m * xi + c);
    const residuals = y.map((yi, i) => yi - yPred[i]);

    return {
      ok: true,
      model: "linear",
      coefficients: { m, c, a: m, b: c },
      equation: "y = m x + c",
      stats: {
        r2: r2Score(y, yPred),
        rmse: rmse(residuals),
        n,
      },
      yPred,
      residuals,
      x: data.x,
      y: data.y,
      xKeys: data.xKeys,
    };
  }

  // Multi-variable linear regression path
  // Build design matrix Xmat: rows = n, cols = (1 + k) where k = number of X columns
  const k = x.length;
  const Xmat = Array.from({ length: n }, (_, i) => {
    const row = [1]; // intercept term
    for (let j = 0; j < k; j++) {
      // for safety, coerce to number
      row.push(Number(x[j][i]));
    }
    return row;
  });

  // Build normal equations: (X^T X) * beta = X^T y
  const XT = Xmat[0].map((_, col) => Xmat.map((r) => r[col])); // transpose
  const XTX = XT.map((rowI) => XT.map((colJ) => rowI.reduce((s, v, idx) => s + v * colJ[idx], 0)));
  const XTy = XT.map((row) => row.reduce((s, v, idx) => s + v * y[idx], 0));

  const beta = solveLinearSystem(XTX, XTy);
  if (!beta)
    return { ok: false, error: "Singular matrix: multivariable linear regression failed." };

  // beta[0] = intercept (c), beta[1]..beta[k] = coefficients for X1..Xk
  const intercept = beta[0];
  const coeffs = beta.slice(1);

  // Compute predictions
  const yPred = Xmat.map((row) => row.reduce((s, v, idx) => s + v * beta[idx], 0));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  // prepare return coefficients in friendly shape
  const coeffObj = { c: intercept };
  coeffs.forEach((val, idx) => {
    // name them m1, m2, ...
    coeffObj[`m${idx + 1}`] = val;
  });

  // also provide array-style coefficients (intercept first) for UI that expects arrays
  const coeffArray = [intercept, ...coeffs];

  // Build equation string: y = m1 x1 + m2 x2 + ... + c
  const eqParts = coeffs.map((v, idx) => `${v} * X${idx + 1}`);
  const eq = `y = ${eqParts.join(" + ")} + ${intercept}`;

  return {
    ok: true,
    model: "linear",
    coefficients: coeffObj, // { c, m1, m2, ... } for UI
    coefficientsArray: coeffArray, // [c, m1, m2,...] (useful in some flows)
    equation: eq,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   POLYNOMIAL
------------------------------------------------------------ */
function polynomialFit(data, degree) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Polynomial regression requires one X column." };

  const X = x[0];
  const n = y.length;
  if (n <= degree)
    return { ok: false, error: "Not enough points for polynomial." };

  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: degree + 1 }, (_, p) => X[i] ** p)
  );

  const AT = A[0].map((_, col) => A.map((row) => row[col]));
  const ATA = AT.map((rowI, i) =>
    AT.map((colJ, j) => rowI.reduce((s, v, k) => s + v * colJ[k], 0))
  );
  const ATy = AT.map((row) => row.reduce((s, v, k) => s + v * y[k], 0));
  const coeffs = solveLinearSystem(ATA, ATy) || Array(degree + 1).fill(NaN);

  const yPred = X.map((xi) =>
    coeffs.reduce((acc, c, p) => acc + c * xi ** p, 0)
  );
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "polynomial",
    degree,
    coefficients: coeffs,
    equation: Array.from(coeffs)
      .map((c, i) => (i === 0 ? `${c}` : `${c} x^${i}`))
      .join(" + "),
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   EXPONENTIAL (safe mode)
------------------------------------------------------------ */
function exponentialFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Exponential requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const lnY = y.map((v, i) => {
    if (v <= 0) domainWarnings.push(`Y[${i}] = ${v} <= 0 (ln invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lin = linearFit({ y: lnY, x: [X], xKeys });

  const b = lin.coefficients.m ?? lin.coefficientsArray?.[1];
  const a = Math.exp(lin.coefficients.c ?? lin.coefficientsArray?.[0] ?? 0);

  const yPred = X.map((xi) => a * Math.exp(b * xi));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "exponential",
    coefficients: { a, b },
    equation: `y = a e^(b x)`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   POWER LAW (safe)
------------------------------------------------------------ */
function powerLawFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Power law requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const lnX = X.map((v, i) => {
    if (v <= 0) domainWarnings.push(`X[${i}] = ${v} <= 0 (log invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lnY = y.map((v, i) => {
    if (v <= 0) domainWarnings.push(`Y[${i}] = ${v} <= 0 (log invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lin = linearFit({ y: lnY, x: [lnX], xKeys });

  const b = lin.coefficients.m ?? lin.coefficientsArray?.[1];
  const a = Math.exp(lin.coefficients.c ?? lin.coefficientsArray?.[0] ?? 0);

  const yPred = X.map((xi, i) => (xi > 0 ? a * xi ** b : NaN));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "powerlaw",
    coefficients: { a, b },
    equation: `y = a x^b`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   LOGARITHMIC (safe)
------------------------------------------------------------ */
function logarithmicFit(data, base) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Logarithmic requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const logFn =
    base === "ln"
      ? (v) => safeLog(v, "ln")
      : base === "log2"
      ? (v) => safeLog(v, "log2")
      : (v) => safeLog(v, "log10");

  const logX = X.map((v, i) => {
    if (v <= 0) domainWarnings.push(`X[${i}] = ${v} <= 0 (log invalid)`);
    return logFn(v);
  });

  const lin = linearFit({ y, x: [logX], xKeys });

  const a = lin.coefficients.m ?? lin.coefficientsArray?.[1];
  const b = lin.coefficients.c ?? lin.coefficientsArray?.[0];

  const yPred = logX.map((lx) => a * lx + b);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "logarithmic",
    coefficients: { a, b, base },
    equation: `y = a log_${base}(x) + b`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   INTERPOLATION
------------------------------------------------------------ */
function interpolationFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Interpolation requires one X column." };

  const X = x[0];
  const pts = X.map((xi, i) => ({ x: xi, y: y[i] })).sort((a, b) => a.x - b.x);

  return {
    ok: true,
    model: "interpolation",
    points: pts,
    info: "Piecewise linear interpolation",
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   MAIN ROUTER
   - If user supplies >1 X and model != linear -> polite message
------------------------------------------------------------ */
export default function runModel(rows, columns, cfg = { model: "linear" }) {
  const extracted = extractData(rows, columns);
  if (!extracted.ok) return extracted;

  const model = (cfg && cfg.model) || "linear";

  // if multiple X columns present and model is not linear, politely decline
  if ((extracted.x?.length || 0) > 1 && model !== "linear") {
    return {
      ok: false,
      error: `The selected model '${model}' does not support multivariable analysis in this version.`,
    };
  }

  switch (model) {
    case "linear":
      return linearFit(extracted);

    case "polynomial":
      return polynomialFit(extracted, cfg.degree || 2);

    case "exponential":
      return exponentialFit(extracted);

    case "powerlaw":
      return powerLawFit(extracted);

    case "logarithmic":
      return logarithmicFit(extracted, cfg.logBase || "log10");

    case "interpolation":
      return interpolationFit(extracted);

    default:
      return { ok: false, error: `Unknown model '${model}'.` };
  }
}
