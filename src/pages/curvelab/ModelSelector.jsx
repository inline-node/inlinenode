import React, { useState } from "react";

export default function ModelSelector({ onChange }) {
  const [model, setModel] = useState("linear");

  // Polynomial
  const [degree, setDegree] = useState(2);

  // Logarithmic
  const [logBase, setLogBase] = useState("log10");

  // Signal Reconstruction
  const [timeValue, setTimeValue] = useState("");
  const [timeUnit, setTimeUnit] = useState("ns");

  const updateParent = (m = model) => {
    if (!onChange) return;
    onChange({
      model: m,
      degree,
      logBase,
      timeValue,
      timeUnit,
    });
  };

  const handleModel = (m) => {
    setModel(m);
    updateParent(m);
  };

  return (
    <div className="mt-3 mb-3 flex items-center gap-4 whitespace-nowrap text-sm text-text dark:text-darkText">
      {/* Model Dropdown */}
      <div className="flex items-center gap-2">
        <span>Model:</span>

        <select
          value={model}
          onChange={(e) => handleModel(e.target.value)}
          className="
            px-3 py-2 rounded-md font-medium cursor-pointer
            border border-border dark:border-darkBorder
            bg-surface dark:bg-darkSurface
            text-text dark:text-darkText
            outline-none
          "
        >
          <option value="linear">Linear</option>
          <option value="polynomial">Polynomial</option>
          <option value="exponential">Exponential</option>
          <option value="powerlaw">Power Law</option>
          <option value="logarithmic">Logarithmic</option>
          <option value="interpolation">Linear Interpolation</option>
          <option value="signal">Signal Reconstruction</option>
        </select>
      </div>

      {/* Polynomial Degree */}
      {model === "polynomial" && (
        <div className="flex items-center gap-2">
          <span>Degree:</span>
          <input
            type="number"
            min={1}
            value={degree}
            onChange={(e) => {
              setDegree(parseInt(e.target.value) || 1);
              updateParent();
            }}
            className="
              w-16 px-2 py-2 rounded-md border
              border-border dark:border-darkBorder
              bg-transparent outline-none
              text-text dark:text-darkText
            "
          />
        </div>
      )}

      {/* Logarithmic Base */}
      {model === "logarithmic" && (
        <div className="flex items-center gap-2">
          <span>Base:</span>
          <select
            value={logBase}
            onChange={(e) => {
              setLogBase(e.target.value);
              updateParent();
            }}
            className="
              px-3 py-2 rounded-md font-medium cursor-pointer
              border border-border dark:border-darkBorder
              bg-surface dark:bg-darkSurface
              text-text dark:text-darkText
              outline-none
            "
          >
            <option value="log10">log10</option>
            <option value="ln">ln</option>
            <option value="log2">log2</option>
          </select>
        </div>
      )}

      {/* Signal Reconstruction - Inline, No Label */}
      {model === "signal" && (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <input
            type="number"
            min="0"
            value={timeValue}
            onChange={(e) => {
              setTimeValue(e.target.value);
              updateParent();
            }}
            placeholder="time"
            className="
              w-20 px-2 py-2 rounded-md border
              border-border dark:border-darkBorder
              bg-transparent outline-none
              text-text dark:text-darkText
            "
          />

          <select
            value={timeUnit}
            onChange={(e) => {
              setTimeUnit(e.target.value);
              updateParent();
            }}
            className="
              px-3 py-2 rounded-md font-medium cursor-pointer
              border border-border dark:border-darkBorder
              bg-surface dark:bg-darkSurface
              text-text dark:text-darkText
              outline-none
            "
          >
            <option value="s">sec</option>
            <option value="ms">ms</option>
            <option value="us">µs</option>
            <option value="ns">ns</option>
          </select>
        </div>
      )}
    </div>
  );
}
