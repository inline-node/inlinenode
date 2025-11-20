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

  /* -------------------------- Header Detection -------------------------- */

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
      firstR
