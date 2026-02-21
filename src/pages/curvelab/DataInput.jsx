import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import ModelSelector from "./ModelSelector";
import runModel from "../../engine/mathEngine";
import extractData from "../../engine/extractData";

export default function DataInput() {
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("curvelab.columns");
      return saved
        ? JSON.parse(saved)
        : [
            { key: "Y", label: "Y" },
            { key: "X", label: "X" },
          ];
    } catch (e) {
      return [
        { key: "Y", label: "Y" },
        { key: "X", label: "X" },
      ];
    }
  });

  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem("curvelab.rows");
      return saved
        ? JSON.parse(saved)
        : Array.from({ length: 10 }).map(() => ({ Y: "", X: "" }));
    } catch (e) {
      return Array.from({ length: 10 }).map(() => ({ Y: "", X: "" }));
    }
  });

  const tableRef = useRef();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  /* --------------------------
     BC-1 Console helper
  -------------------------- */
  const logConsole = (message, extra = null) => {
    window.dispatchEvent(
      new CustomEvent("curvelab:console", {
        detail: { message, extra },
      })
    );
  };

  /* --------------------------------------------------
     GLOBAL TABLE PUBLISH (NO CONSOLE SPAM IN A2 MODE)
  -------------------------------------------------- */
  const publishTable = (nextRows = rows, nextColumns = columns) => {
    try {
      localStorage.setItem("curvelab.rows", JSON.stringify(nextRows));
      localStorage.setItem("curvelab.columns", JSON.stringify(nextColumns));
    } catch (e) {}

    window.__curvelab_table = {
      rows: nextRows,
      columns: nextColumns,
    };

    window.dispatchEvent(
      new CustomEvent("curvelab:dataUpdated", {
        detail: window.__curvelab_table,
      })
    );

    try {
      const extracted = extractData(nextRows, nextColumns, {
        allowPartialRows: true,
      });
      if (extracted && extracted.ok) {
        window.dispatchEvent(
          new CustomEvent("curvelab:dataPreview", {
            detail: {
              y: extracted.y,
              x: extracted.x,
              xKeys: extracted.xKeys,
            },
          })
        );
      }
    } catch (e) {}
  };

  useEffect(() => {
    publishTable(rows, columns);

    try {
      const savedResult = localStorage.getItem("curvelab.modelResult");
      if (savedResult) {
        window.dispatchEvent(
          new CustomEvent("curvelab:modelResult", {
            detail: JSON.parse(savedResult),
          })
        );
        logConsole("Restored previous results");
      }
    } catch (e) {}

    try {
      const savedCfg = localStorage.getItem("curvelab.modelConfig");
      if (savedCfg) window.__curvelab_modelConfig = JSON.parse(savedCfg);
    } catch (e) {}

    const handler = () => {
      window.__curvelab_table = { rows, columns };
    };

    window.addEventListener("curvelab:requestTable", handler);
    return () => window.removeEventListener("curvelab:requestTable", handler);
  }, []);

  useEffect(() => {
    const onCfg = (ev) => {
      try {
        localStorage.setItem("curvelab.modelConfig", JSON.stringify(ev.detail));
      } catch (e) {}
      window.__curvelab_modelConfig = ev.detail;
    };

    window.addEventListener("curvelab:modelConfig", onCfg);
    return () => window.removeEventListener("curvelab:modelConfig", onCfg);
  }, []);

  /* --------------------------------------------------
     Helpers
  -------------------------------------------------- */

  const ensureCell = (r, cKey) => {
    setRows((prev) => {
      const copy = prev.slice();
      while (copy.length <= r)
        copy.push(Object.fromEntries(columns.map((col) => [col.key, ""])));
      if (!(cKey in copy[r])) copy[r][cKey] = "";
      publishTable(copy, columns);
      return copy;
    });
  };

  const setCell = (r, cKey, value) => {
    setRows((prev) => {
      const copy = prev.slice();
      while (copy.length <= r)
        copy.push(Object.fromEntries(columns.map((col) => [col.key, ""])));
      copy[r] = { ...copy[r], [cKey]: value };
      publishTable(copy, columns);
      return copy;
    });
  };

  const addColumn = () => {
    const xCount = columns.filter((c) => c.key.startsWith("X")).length;
    const nextIndex = xCount + 1;
    const rawKey = nextIndex === 1 ? "X" : `X${nextIndex}`;
    const key = columns.some((c) => c.key === rawKey)
      ? rawKey + "_" + Date.now()
      : rawKey;

    const newCol = [...columns, { key, label: rawKey }];
    const nextRows = rows.map((r) => ({ ...r, [key]: "" }));

    setColumns(newCol);
    setRows(nextRows);
    publishTable(nextRows, newCol);

    logConsole("Column added", [`Label: ${rawKey}`]);
  };

  /* --------------------------------------------------
     Import CSV/XLSX
  -------------------------------------------------- */

  const handleImportFile = async (file) => {
    logConsole("Importing file…", [`Name: ${file.name}`]);

    const name = file.name.toLowerCase();

    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      Papa.parse(file, {
        complete: (results) => applyImportedData(results.data),
      });
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
      });
      applyImportedData(json);
    } else {
      logConsole("Import failed", ["Unsupported file type"]);
      alert("Unsupported file type. Use CSV or XLSX.");
    }
  };

  /* --------------------------------------------------
     HEADER DETECTION
  -------------------------------------------------- */

  const applyImportedData = (grid) => {
    if (!grid || !grid.length) return;

    while (
      grid.length &&
      grid[grid.length - 1].every(
        (c) => c === null || c === undefined || String(c).trim() === ""
      )
    )
      grid.pop();

    if (!grid.length) return;

    const firstRow = (grid[0] || []).map((v) => String(v ?? "").trim());
    const secondRow = grid[1]
      ? (grid[1] || []).map((v) => String(v ?? "").trim())
      : [];

    const firstIsTextCount = firstRow.reduce(
      (s, v) => s + (isNaN(parseFloat(v)) ? 1 : 0),
      0
    );
    const secondNumericCount = secondRow.reduce(
      (s, v) => s + (!isNaN(parseFloat(v)) ? 1 : 0),
      0
    );

    const firstMostlyText = firstRow.length
      ? firstIsTextCount / firstRow.length >= 0.4
      : false;
    const secondMostlyNumeric = secondRow.length
      ? secondNumericCount / secondRow.length >= 0.5
      : false;

    const firstLooksHeader =
      firstRow.some((v) => ["x", "y"].includes(v.toLowerCase())) ||
      firstRow.some((v) => /^x\d+$/i.test(v));

    const useHeader =
      (firstMostlyText && secondMostlyNumeric) || firstLooksHeader;

    logConsole("Header detection", [
      `Using header: ${useHeader}`,
      `firstMostlyText: ${firstMostlyText}`,
      `secondMostlyNumeric: ${secondMostlyNumeric}`,
      `explicitHeader: ${firstLooksHeader}`,
    ]);

    let newColumns = [];
    let startRow = 0;

    if (useHeader) {
      newColumns = firstRow.map((h, i) => {
        const upper = h.toUpperCase();
        if (upper === "Y") return { key: "Y", label: "Y" };
        if (upper === "X") return { key: "X", label: "X" };
        if (/^X\d+$/i.test(upper)) return { key: upper, label: upper };

        const sanitized = h
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\w_]/g, "");
        return { key: sanitized || `C${i + 1}`, label: h || `C${i + 1}` };
      });

      const labelsLower = newColumns.map((c) => c.label.toLowerCase().trim());

      if (!labelsLower.includes("y") && newColumns.length >= 1) {
        newColumns[0] = {
          ...newColumns[0],
          key: "Y",
          label: newColumns[0].label || "Y",
        };
      }

      if (
        !labelsLower.includes("x") &&
        !labelsLower.some((k) => /^x\d+$/i.test(k)) &&
        newColumns.length >= 2
      ) {
        newColumns[1] = {
          ...newColumns[1],
          key: "X",
          label: newColumns[1].label || "X",
        };
      }

      startRow = 1;
    } else {
      const maxCols = Math.max(...grid.map((r) => r.length));
      for (let i = 0; i < maxCols; i++) {
        if (i === 0) newColumns.push({ key: "Y", label: "Y" });
        else if (i === 1) newColumns.push({ key: "X", label: "X" });
        else newColumns.push({ key: `X${i}`, label: `X${i}` });
      }
    }

    const dataRows = grid.slice(startRow).map((r) => {
      const obj = {};
      newColumns.forEach((c, i) => {
        obj[c.key] = r[i] === undefined || r[i] === null ? "" : String(r[i]);
      });
      return obj;
    });

    setColumns(newColumns);
    setRows(dataRows);
    publishTable(dataRows, newColumns);

    logConsole("Import complete", [
      `Rows: ${dataRows.length}`,
      `Columns: ${newColumns.length}`,
    ]);
  };

  /* --------------------------------------------------
     Paste handling (A2: NO LOG SPAM)
  -------------------------------------------------- */

  const handlePaste = (e, rStart, cKeyStart) => {
    e.preventDefault();

    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const lines = text.split(/\r\n|\n|\r/).filter((l) => l !== "");
    const matrix = lines.map((l) => l.split(/\t|,/));

    setRows((prev) => {
      const copy = prev.slice();
      for (let ri = 0; ri < matrix.length; ri++) {
        const rr = rStart + ri;

        while (copy.length <= rr)
          copy.push(Object.fromEntries(columns.map((c) => [c.key, ""])));

        const startIndex = columns.findIndex((c) => c.key === cKeyStart);

        for (let ci = 0; ci < matrix[ri].length; ci++) {
          const colIndex = Math.min(
            columns.length - 1,
            Math.max(0, startIndex + ci)
          );
          const key = columns[colIndex].key;
          copy[rr][key] = matrix[ri][ci];
        }
      }

      publishTable(copy, columns);
      return copy;
    });
  };

  /* --------------------------------------------------
     Cell editing
  -------------------------------------------------- */

  // Live cell input handler — updates rows as the user types (keeps same behavior as onBlur)
  const handleCellInput = (r, cKey, text) => {
    setRows((prev) => {
      const copy = prev.slice();
      while (copy.length <= r) copy.push(Object.fromEntries(columns.map((c) => [c.key, ""])));
      copy[r] = { ...copy[r], [cKey]: text };
      // publishTable will persist and dispatch dataPreview + dataUpdated
      publishTable(copy, columns);
      return copy;
    });
  };

  const onCellBlur = (r, key, e) => {
    const val = e.target.innerText.trim();
    setCell(r, key, val);
  };

  const onCellKeyDown = (e, r, key) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
      ensureCell(r + 1, key);
    }
  };

  /* --------------------------------------------------
     Reset Table
  -------------------------------------------------- */

  const resetTable = () => {
    const newCols = [
      { key: "Y", label: "Y" },
      { key: "X", label: "X" },
    ];
    const newRows = Array.from({ length: 10 }).map(() => ({
      Y: "",
      X: "",
    }));

    setColumns(newCols);
    setRows(newRows);
    publishTable(newRows, newCols);

    try {
      localStorage.removeItem("curvelab.modelResult");
    } catch (e) {}

    window.dispatchEvent(
      new CustomEvent("curvelab:modelResult", {
        detail: { cleared: true },
      })
    );

    logConsole("Reset complete", ["Table, graph & results cleared"]);
  };

  /* --------------------------------------------------
     FIT
  -------------------------------------------------- */

  const handleFit = () => {
    // Always use the last selected model from memory/localStorage
    let cfg = window.__curvelab_modelConfig;

    if (!cfg) {
      try {
        cfg = JSON.parse(localStorage.getItem("curvelab.modelConfig"));
      } catch (e) {
        cfg = null;
      }
    }

    if (!cfg || !cfg.model) {
      cfg = { model: "linear", degree: 2, logBase: "log10" };
    }

    const pts = rows.length;

    logConsole(`Running ${cfg.model} fit…`, [
      `Model: ${cfg.model}`,
      `Points: ${pts}`,
    ]);

    try {
      const out = runModel(rows, columns, cfg);

      out._sourceRows = rows;
      out._sourceColumns = columns;

      try {
        localStorage.setItem("curvelab.modelResult", JSON.stringify(out));
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("curvelab:modelResult", { detail: out })
      );

      logConsole(
        `Fit complete: ${cfg.model}`,
        [
          `ok: ${out.ok}`,
          out.stats?.r2 ? `R² = ${out.stats.r2.toFixed(6)}` : null,
          out.stats?.rmse ? `RMSE = ${out.stats.rmse.toFixed(6)}` : null,
        ].filter(Boolean)
      );
    } catch (err) {
      logConsole("Fit failed", [err?.message || String(err)]);
      window.dispatchEvent(
        new CustomEvent("curvelab:modelResult", {
          detail: { ok: false, errors: [err?.message || String(err)] },
        })
      );
    }
  };

  /* --------------------------------------------------
     UI RENDER
  -------------------------------------------------- */

  return (
    <section className="p-3 h-full flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="hidden md:block text-lg font-semibold">Data</h2>

        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch gap-2 text-sm w-full sm:w-auto">
          <label className="h-12 sm:h-auto px-2 sm:px-3 py-2 sm:py-[6px] rounded-md font-medium cursor-pointer border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all text-center">
            Import
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) handleImportFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <button
            onClick={addColumn}
            className="h-12 sm:h-auto px-2 sm:px-3 py-2 sm:py-[6px] rounded-md font-medium border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all text-center"
          >
            + Column
          </button>

          <button
            onClick={() => {
              const next = [
                ...rows,
                Object.fromEntries(columns.map((c) => [c.key, ""])),
              ];
              setRows(next);
              publishTable(next, columns);
              logConsole("Row added", [`New row index: ${next.length - 1}`]);
            }}
            className="h-12 sm:h-auto px-2 sm:px-3 py-2 sm:py-[6px] rounded-md font-medium border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all text-center"
          >
            + Row
          </button>

          <button
            onClick={handleFit}
            className="h-12 sm:h-auto px-3 sm:px-4 py-2 rounded-md font-medium bg-[#a9df05] dark:bg-[#a9df05] text-gray-900 hover:opacity-95 transition-all text-center"
            title="Fit curve using selected model"
          >
            Fit Curve
          </button>

          <button
            onClick={resetTable}
            className="h-12 sm:h-auto px-2 sm:px-3 py-2 rounded-md font-medium border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all text-center"
          >
            Reset
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-x-auto border rounded" ref={tableRef}>
        <table className="w-full md:min-w-full border-collapse table-fixed md:table-auto">
          <thead>
            <tr>
              <th className="w-10 p-1 sticky top-0 bg-surface dark:bg-darkSurface text-text dark:text-darkText border-r border-border dark:border-darkBorder">
                N
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="p-1 sticky top-0 bg-surface dark:bg-darkSurface text-text dark:text-darkText border-r border-border dark:border-darkBorder text-left break-words"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, r) => (
              <tr
                key={r}
                className="border-t border-border dark:border-darkBorder"
              >
                <td className="w-10 p-1 text-sm border-r border-border dark:border-darkBorder">
                  {r + 1}
                </td>

                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="p-0 border-r border-border dark:border-darkBorder"
                  >
                    <div
                      role="textbox"
                      tabIndex={0}
                      contentEditable
                      suppressContentEditableWarning
                      data-r={r}
                      data-c={col.key}
                      className="p-2 min-w-0 md:min-w-[120px] w-full text-sm outline-none text-text dark:text-darkText bg-surface dark:bg-darkSurface break-words"
                      
                      onInput={(e) => {
                        const el = e.currentTarget;
                    
                        // Capture caret position BEFORE React updates
                        const sel = window.getSelection();
                        const caretOffset =
                          sel && sel.rangeCount > 0
                            ? sel.getRangeAt(0).startOffset
                            : null;
                    
                        // Update table data
                        handleCellInput(r, col.key, el.innerText);
                    
                        // Restore caret after DOM updates
                        requestAnimationFrame(() => {
                          try {
                            const range = document.createRange();
                            range.setStart(el.childNodes[0] || el, caretOffset || 0);
                            range.collapse(true);
                    
                            const sel2 = window.getSelection();
                            sel2.removeAllRanges();
                            sel2.addRange(range);
                          } catch {}
                        });
                      }}
                    
                      onBlur={(e) => onCellBlur(r, col.key, e)}
                      onKeyDown={(e) => onCellKeyDown(e, r, col.key)}
                      onPaste={(e) => handlePaste(e, r, col.key)}
                    >
                      {row[col.key] ?? ""}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODEL SELECTOR */}
      <div className="mt-3 px-2 pb-2">
        <ModelSelector />
      </div>
    </section>
  );
}
