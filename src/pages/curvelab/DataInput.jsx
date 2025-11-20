import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import ModelSelector from "./ModelSelector";

export default function DataInput() {
  const [columns, setColumns] = useState([
    { key: "Y", label: "Y" },
    { key: "X", label: "X" },
  ]);

  const [rows, setRows] = useState(() =>
    Array.from({ length: 10 }).map(() => ({ Y: "", X: "" }))
  );

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const tableRef = useRef();

  /* -------------------------- Helpers -------------------------- */

  const ensureCell = (r, cKey) => {
    setRows((prev) => {
      const copy = prev.slice();
      while (copy.length <= r)
        copy.push(Object.fromEntries(columns.map((col) => [col.key, ""])));
      if (!(cKey in copy[r])) copy[r][cKey] = "";
      return copy;
    });
  };

  const setCell = (r, cKey, value) => {
    setRows((prev) => {
      const copy = prev.slice();
      while (copy.length <= r)
        copy.push(Object.fromEntries(columns.map((col) => [col.key, ""])));
      copy[r] = { ...copy[r], [cKey]: value };
      return copy;
    });
  };

  const addColumn = () => {
    const xCount = columns.filter((c) => c.key.startsWith("X")).length;
    const nextIndex = xCount + 1;
    const newKey = nextIndex === 1 ? "X" : `X${nextIndex}`;
    const key = columns.some((c) => c.key === newKey)
      ? `${newKey}_${Date.now()}`
      : newKey;
    const label = newKey;

    setColumns((prev) => {
      const cols = [...prev, { key, label }];
      setRows((rp) =>
        rp.map((row) => ({
          ...row,
          [key]: "",
        }))
      );
      return cols;
    });
  };

  /* -------------------------- Import CSV/XLSX -------------------------- */

  const handleImportFile = async (file) => {
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      Papa.parse(file, {
        complete: (results) => {
          applyImportedData(results.data);
        },
      });
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      applyImportedData(json);
    } else {
      alert("Unsupported file type. Use CSV or XLSX.");
    }
  };

  /* ----------------------- Header Detection ----------------------- */

  const applyImportedData = (grid) => {
    if (!grid || !grid.length) return;

    while (
      grid.length &&
      grid[grid.length - 1].every(
        (cell) =>
          cell === null || cell === undefined || String(cell).trim() === ""
      )
    ) {
      grid.pop();
    }

    if (!grid.length) return;

    const firstRow = grid[0];
    const secondRow = grid.length > 1 ? grid[1] : [];

    const firstRowText = firstRow.map((v) => String(v ?? "").trim());
    const firstRowNumericFlags = firstRowText.map((v) => !isNaN(parseFloat(v)));
    const secondRowNumericFlags = secondRow.map((v) => !isNaN(parseFloat(v)));

    const firstRowMostlyText =
      firstRowNumericFlags.filter((n) => n === false).length >=
      Math.ceil(firstRow.length * 0.6);

    const secondRowMostlyNumeric =
      secondRowNumericFlags.filter((n) => n === true).length >=
      Math.ceil(secondRow.length * 0.6);

    const firstRowLooksLikeHeader =
      firstRow.some((h) =>
        ["y", "x"].includes(String(h).trim().toLowerCase())
      ) || firstRow.some((h) => /^x\d+$/i.test(String(h).trim()));

    const useHeader =
      (firstRowMostlyText && secondRowMostlyNumeric) || firstRowLooksLikeHeader;

    let headers = [];
    let dataStartIndex = 0;

    if (useHeader) {
      headers = firstRowText.map((h, i) => {
        const clean = h || "";
        const upper = clean.trim().toUpperCase();

        if (upper === "Y") return { key: "Y", label: "Y" };
        if (upper === "X") return { key: "X", label: "X" };
        if (/^X\d+$/i.test(upper)) return { key: upper, label: upper };

        return { key: `C${i + 1}`, label: clean || `C${i + 1}` };
      });

      dataStartIndex = 1;
    } else {
      const maxCols = Math.max(...grid.map((r) => r.length));
      for (let i = 0; i < maxCols; i++) {
        if (i === 0) headers.push({ key: "Y", label: "Y" });
        else if (i === 1) headers.push({ key: "X", label: "X" });
        else headers.push({ key: `X${i}`, label: `X${i}` });
      }
      dataStartIndex = 0;
    }

    setColumns(headers);

    const dataRows = grid.slice(dataStartIndex);

    const mapped = dataRows.map((r) => {
      const obj = {};
      headers.forEach((c, i) => {
        obj[c.key] = r[i] === undefined || r[i] === null ? "" : String(r[i]);
      });
      return obj;
    });

    setRows(mapped);
  };

  /* -------------------------- Paste Handling -------------------------- */

  const handlePaste = (e, startR, startCKey) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData(
      "text/plain"
    );
    if (!text) return;

    const rowsText = text.split(/\r\n|\n|\r/).filter((r) => r !== "");
    const parsed = rowsText.map((r) => r.split(/\t|,/));

    setRows((prev) => {
      const copy = prev.slice();
      for (let i = 0; i < parsed.length; i++) {
        const targetR = startR + i;
        while (copy.length <= targetR)
          copy.push(Object.fromEntries(columns.map((col) => [col.key, ""])));

        for (let j = 0; j < parsed[i].length; j++) {
          const startIndex = columns.findIndex((c) => c.key === startCKey);
          const targetCIndex = Math.min(
            columns.length - 1,
            Math.max(0, startIndex + j)
          );
          const key = columns[targetCIndex].key;
          copy[targetR][key] = parsed[i][j];
        }
      }
      return copy;
    });
  };

  /* -------------------------- Cell Editing -------------------------- */

  const onCellBlur = (r, key, e) => {
    const text = e.target.innerText;
    setCell(r, key, text);
  };

  const onCellKeyDown = (e, r, key) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
      const nextR = r + 1;
      ensureCell(nextR, key);
      setTimeout(() => {
        const el =
          tableRef.current &&
          tableRef.current.querySelector(
            `[data-r='${nextR}'][data-c='${key}']`
          );
        if (el) el.focus();
      }, 50);
    }
  };

  /* -------------------------- Column Fix -------------------------- */

  useEffect(() => {
    setRows((prev) =>
      prev.map((row) => {
        const copy = { ...row };
        columns.forEach((c) => {
          if (!(c.key in copy)) copy[c.key] = "";
        });
        return copy;
      })
    );
  }, [columns]);

  /* -------------------------- Model Change -------------------------- */

  const handleModelChange = (cfg) => {
    const ev = new CustomEvent("curvelab:modelChange", { detail: cfg });
    window.dispatchEvent(ev);
    console.log("[CurveLab] Model changed:", cfg);
  };

  /* -------------------------- Reset -------------------------- */

  const resetTable = () => {
    setColumns([
      { key: "Y", label: "Y" },
      { key: "X", label: "X" },
    ]);
    setRows(
      Array.from({ length: 10 }).map(() => ({
        Y: "",
        X: "",
      }))
    );
  };

  /* -------------------------- Render -------------------------- */

  return (
    <section className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Data</h2>

        {/* ---------- MOBILE-FIX TOOLBAR ---------- */}
        <div
          className="
            flex flex-wrap items-center gap-2 text-sm
            sm:flex-nowrap
          "
        >
          {/* Import */}
          <label
            className="
              px-3 py-[6px] rounded-md font-medium cursor-pointer border border-border dark:border-darkBorder
              bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all
              w-[48%] sm:w-auto text-xs sm:text-sm py-1 sm:py-[6px]
            "
          >
            Import
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) handleImportFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>

          {/* Add column */}
          <button
            onClick={addColumn}
            className="
              px-3 py-[6px] rounded-md font-medium border border-border dark:border-darkBorder bg-transparent
              text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all
              w-[48%] sm:w-auto text-xs sm:text-sm py-1 sm:py-[6px]
            "
          >
            + Column
          </button>

          {/* Add row */}
          <button
            onClick={() =>
              setRows((r) => [
                ...r,
                Object.fromEntries(columns.map((c) => [c.key, ""])),
              ])
            }
            className="
              px-3 py-[6px] rounded-md font-medium border border-border dark:border-darkBorder bg-transparent
              text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all
              w-[48%] sm:w-auto text-xs sm:text-sm py-1 sm:py-[6px]
            "
          >
            + Row
          </button>

          {/* Fit Curve */}
          <button
            onClick={() => console.log("[CurveLab] Fit Curve Triggered (TEMP)")}
            className="
              px-4 py-2 rounded-md font-medium bg-[#a9df05] dark:bg-[#a9df05]
              text-gray-900 dark:text-gray-900 hover:opacity-95 transition-all
              w-[48%] sm:w-auto text-xs sm:text-sm py-1 sm:py-2
            "
          >
            Fit Curve
          </button>

          {/* Reset */}
          <button
            onClick={resetTable}
            className="
              px-3 py-2 rounded-md font-medium border border-border dark:border-darkBorder bg-transparent
              text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all
              w-[48%] sm:w-auto text-xs sm:text-sm py-1 sm:py-2
            "
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border rounded" ref={tableRef}>
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="p-1 sticky top-0 bg-surface dark:bg-darkSurface text-text dark:text-darkText border-r border-border dark:border-darkBorder">
                N
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="p-1 sticky top-0 bg-surface dark:bg-darkSurface text-text dark:text-darkText border-r border-border dark:border-darkBorder text-left"
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
                <td className="p-1 text-sm border-r border-border dark:border-darkBorder">
                  {r + 1}
                </td>

                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="p-0 border-r border-border dark:border-darkBorder"
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      data-r={r}
                      data-c={col.key}
                      onBlur={(e) => onCellBlur(r, col.key, e)}
                      onKeyDown={(e) => onCellKeyDown(e, r, col.key)}
                      onPaste={(e) => handlePaste(e, r, col.key)}
                      className="p-2 min-w-[120px] text-sm outline-none text-text dark:text-darkText bg-surface dark:bg-darkSurface"
                      role="textbox"
                      tabIndex={0}
                      dangerouslySetInnerHTML={{
                        __html:
                          row[col.key] !== undefined
                            ? String(row[col.key])
                            : "",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Advanced Controls */}
      <div className="mt-2">
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm bg-transparent border-t border-border dark:border-darkBorder text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              {advancedOpen
                ? "Hide Advanced Controls"
                : "Show Advanced Controls"}
            </span>
          </div>

          <svg
            className={`w-4 h-4 transform transition-transform ${
              advancedOpen ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {advancedOpen && (
          <div className="mt-2 px-2 pb-2">
            <ModelSelector onChange={handleModelChange} />
          </div>
        )}
      </div>
    </section>
  );
}
