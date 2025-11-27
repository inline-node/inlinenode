import React, { useEffect, useState, useRef } from "react";

/*
  ConsoleArea:
  - Displays human-readable log messages
  - Supports multiline messages with indentation
  - Auto-scrolls to bottom when new messages come in
  - Now includes: Clear + Flush buttons
*/

export default function ConsoleArea() {
  const [lines, setLines] = useState([]);
  const endRef = useRef(null);

  const addMessage = (msg) => {
    setLines((prev) => [...prev, msg]);
  };

  /* -------------------------
     CLEAR (session only)
  ------------------------- */
  const handleClear = () => {
    setLines([]);
    localStorage.setItem("curvelab.logs", "[]");
    const t = new Date().toLocaleTimeString();
    addMessage(`[${t}] Console cleared.`);
  };

  /* -------------------------
     FLUSH (full wipe)
     Clears:
       - console view
       - model results
       - saved tables
       - saved model config
  ------------------------- */
  const handleFlush = () => {
    try {
      localStorage.removeItem("curvelab.modelResult");
      localStorage.removeItem("curvelab.rows");
      localStorage.removeItem("curvelab.columns");
      localStorage.removeItem("curvelab.modelConfig");
      localStorage.removeItem("curvelab.logs");
    } catch (e) {}

    setLines([]);
    const t = new Date().toLocaleTimeString();
    addMessage(`[${t}] Full flush completed.`);
  };

  /* -------------------------
     EVENT LISTENER
  ------------------------- */
  useEffect(() => {
    const handler = (ev) => {
      const payload = ev.detail;
      if (!payload) return;

      const msg = payload.message || "";
      const time = new Date().toLocaleTimeString();
      const formatted = `[${time}] ${msg}`;

      addMessage(formatted);

      if (payload.extra && Array.isArray(payload.extra)) {
        payload.extra.forEach((line) => {
          addMessage(`  ${line}`);
        });
      }
    };

    window.addEventListener("curvelab:console", handler);

    addMessage(`[${new Date().toLocaleTimeString()}] Console ready.`);
    try {
      const stored = JSON.parse(localStorage.getItem("curvelab.logs") || "[]");
      if (stored.length) {
        setLines(stored);
      }
    } catch {}

    return () => window.removeEventListener("curvelab:console", handler);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("curvelab.logs", JSON.stringify(lines));
    } catch {}
  }, [lines]);

  /* Auto-scroll */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Console</h2>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1 rounded-md font-medium text-sm border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition"
          >
            Clear
          </button>

          <button
            onClick={handleFlush}
            className="px-3 py-1 rounded-md font-medium text-sm border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition"
          >
            Flush
          </button>
        </div>
      </div>

      {/* LOG OUTPUT */}
      <div className="flex-1 border rounded bg-surface dark:bg-darkSurface p-2 overflow-auto text-sm font-mono">
        {lines.map((ln, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {ln}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
