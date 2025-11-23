import React, { useState, useEffect } from "react";

export default function ModelSelector() {
  const [model, setModel] = useState("linear");
  const [degree, setDegree] = useState(2);
  const [logBase, setLogBase] = useState("log10");

  // Restore saved config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("curvelab.modelConfig");
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg.model) setModel(cfg.model);
        if (cfg.degree) setDegree(cfg.degree);
        if (cfg.logBase) setLogBase(cfg.logBase);
      }
    } catch {}
  }, []);

  // Dispatch configuration to global listeners
  const publish = (next = {}) => {
    const cfg = {
      model,
      degree,
      logBase,
      ...next,
    };

    localStorage.setItem("curvelab.modelConfig", JSON.stringify(cfg));
    window.__curvelab_modelConfig = cfg;

    window.dispatchEvent(
      new CustomEvent("curvelab:modelConfig", { detail: cfg })
    );
  };

  // Handlers
  const onModelChange = (m) => {
    setModel(m);
    publish({ model: m });
  };

  const onDegreeChange = (v) => {
    const d = Number(v) || 1;
    setDegree(d);
    publish({ degree: d });
  };

  const onBaseChange = (b) => {
    setLogBase(b);
    publish({ logBase: b });
  };

  return (
    <div className="flex flex-wrap gap-3 text-sm items-center">
      {/* Model selector */}
      <div className="flex items-center gap-2">
        <span>Model:</span>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="px-3 py-2 rounded-md border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
        >
          <option value="linear">Linear</option>
          <option value="polynomial">Polynomial</option>
          <option value="exponential">Exponential</option>
          <option value="powerlaw">Power Law</option>
          <option value="logarithmic">Logarithmic</option>
          <option value="interpolation">Interpolation</option>
        </select>
      </div>

      {/* Polynomial degree */}
      {model === "polynomial" && (
        <div className="flex items-center gap-2">
          <span>Degree:</span>
          <input
            type="number"
            min={1}
            value={degree}
            onChange={(e) => onDegreeChange(e.target.value)}
            className="w-20 px-2 py-2 rounded-md border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
          />
        </div>
      )}

      {/* Logarithmic base */}
      {model === "logarithmic" && (
        <div className="flex items-center gap-2">
          <span>Base:</span>
          <select
            value={logBase}
            onChange={(e) => onBaseChange(e.target.value)}
            className="px-3 py-2 rounded-md border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
          >
            <option value="log10">log10</option>
            <option value="ln">ln</option>
            <option value="log2">log2</option>
          </select>
        </div>
      )}
    </div>
  );
}
