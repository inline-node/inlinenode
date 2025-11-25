// src/pages/curvelab/GraphArea.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  CategoryScale,
  Title,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Scatter } from "react-chartjs-2";
import runModel from "../../engine/mathEngine"; // used to compute per-X fits when possible

ChartJS.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler,
  zoomPlugin
);

/*
  New visual rules:
  - Each X column gets a distinct color. Both its data points and its fit share that color.
  - Interpolation uses the first X column color.
  - Gridlines are subtle and theme aware.
  - No overlays. No surprises.
*/

const PALETTE = [
  "#f97316", // orange
  "#10b981", // green
  "#3b82f6", // blue
  "#eab308", // yellow
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // teal
  "#fb7185", // rose
];

// helper: pick theme-aware grid color
function gridColor() {
  try {
    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  } catch {
    return "rgba(0,0,0,0.06)";
  }
}

function evalPolynomial(coeffArray, xv) {
  if (!Array.isArray(coeffArray)) return NaN;
  return coeffArray.reduce((s, c, p) => s + c * Math.pow(xv, p), 0);
}

// sample a fit result into dense X,Y pairs for plotting
function sampleCurve(result, xArr, sampleCount = 300) {
  if (!result || !result.ok) return { xs: [], ys: [] };

  const model = result.model;
  const coeffs = result.coefficients || {};
  const X = Array.isArray(xArr) ? xArr : [];

  if (!X.length) return { xs: [], ys: [] };

  const xmin = Math.min(...X);
  const xmax = Math.max(...X);
  if (!isFinite(xmin) || !isFinite(xmax)) return { xs: [], ys: [] };

  const xs = [];
  const ys = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const xv = xmin + (xmax - xmin) * t;
    let yv = NaN;

    if (model === "polynomial") {
      yv = evalPolynomial(Array.isArray(coeffs) ? coeffs : coeffs.array, xv);
    } else if (model === "linear") {
      const m =
        coeffs.m ?? coeffs.a ?? (Array.isArray(coeffs) ? coeffs[1] : undefined);
      const c =
        coeffs.c ?? coeffs.b ?? (Array.isArray(coeffs) ? coeffs[0] : undefined);
      if (m !== undefined && c !== undefined) yv = m * xv + c;
    } else if (model === "exponential") {
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * Math.exp(coeffs.b * xv);
    } else if (model === "powerlaw") {
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * Math.pow(xv, coeffs.b);
    } else if (model === "logarithmic") {
      const base = coeffs.base || result.logBase || "log10";
      const logFn = base === "ln" ? Math.log : base === "log2" ? Math.log2 : Math.log10;
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * logFn(xv) + coeffs.b;
    } else if (model === "interpolation") {
      // interpolation is handled by explicit seg/points plotting
      yv = NaN;
    }

    xs.push(Number(xv));
    ys.push(Number(yv));
  }
  return { xs, ys };
}

// Build Chart.js datasets: one data scatter + its fit line per X column
function buildDatasetsForAllX(result) {
  if (!result || !result.ok) return { datasets: [] };

  const datasets = [];
  const xCols = result.x || [];
  const yArr = result.y || [];
  const xKeys = result.xKeys || [];

  // for each X column: scatter + attempt a fit
  for (let ci = 0; ci < xCols.length; ci++) {
    const xcol = xCols[ci] || [];
    const color = PALETTE[ci % PALETTE.length];

    // Data scatter
    const pts = xcol.map((xv, i) => ({
      x: Number(xv),
      y: Number(yArr[i]),
    }));
    datasets.push({
      label: `Data — ${xKeys[ci] || `X${ci + 1}`}`,
      data: pts,
      showLine: false,
      pointRadius: 3,
      backgroundColor: color,
      borderColor: color,
      order: 2,
      // use circle point style for clarity
      pointStyle: "circle",
    });

    // Attempt to compute a fit for this X column:
    // If primary result includes _sourceRows/_sourceColumns we can run a per-X fit safely.
    // Otherwise, try to synthesize rows from arrays and run model.
    let fitResult = null;
    try {
      const cfg = window.__curvelab_modelConfig || JSON.parse(localStorage.getItem("curvelab.modelConfig") || "{}") || { model: result.model || "linear" };

      // create minimal rows + columns for single X
      const syntheticCols = [{ key: "Y", label: "Y" }, { key: "X", label: xKeys[ci] || `X${ci + 1}` }];
      const syntheticRows = xcol.map((xv, i) => {
        return { Y: yArr[i], X: xv };
      });

      // runModel will validate and either compute or return an error object
      const out = runModel(syntheticRows, syntheticCols, cfg);
      if (out && out.ok) fitResult = out;
      else fitResult = null;
    } catch (err) {
      fitResult = null;
    }

    // If fitResult exists and provides sampleable curve -> draw it
    if (fitResult && fitResult.model !== "interpolation") {
      const { xs, ys } = sampleCurve(fitResult, xcol, 300);
      if (xs.length) {
        const fitPts = xs.map((xv, i) => ({ x: xv, y: ys[i] }));
        datasets.push({
          label: `Fit — ${xKeys[ci] || `X${ci + 1}`}`,
          data: fitPts,
          showLine: true,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          pointRadius: 0,
          tension: fitResult.model === "linear" ? 0 : 0.25,
          borderWidth: 2,
          order: 1,
        });
      } else if (fitResult.yPred && fitResult.yPred.length === xcol.length) {
        // fallback: plot predicted points in order of X column
        const predPts = xcol.map((xv, i) => ({ x: Number(xv), y: Number(fitResult.yPred[i]) }));
        datasets.push({
          label: `Fit — ${xKeys[ci] || `X${ci + 1}`}`,
          data: predPts,
          showLine: true,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          pointRadius: 0,
          tension: 0.25,
          borderWidth: 2,
          order: 1,
        });
      }
    }

    // Interpolation: if user used interpolation as model, plot piecewise lines using first X only
    if (result.model === "interpolation" && ci === 0) {
      // result.points may exist (x,y)
      const ptsInterp = result.points && result.points.length
        ? result.points.map((p) => ({ x: Number(p.x), y: Number(p.y) }))
        : xcol.map((xv, i) => ({ x: Number(xv), y: Number(yArr[i]) }));
      datasets.push({
        label: `Interpolation — ${xKeys[ci] || `X${ci + 1}`}`,
        data: ptsInterp.sort((a,b)=>a.x-b.x),
        showLine: true,
        fill: false,
        borderColor: color,
        backgroundColor: color,
        pointRadius: 0,
        tension: 0,
        borderWidth: 2,
        order: 1,
      });
    }
  }

  return { datasets };
}

export default function GraphArea() {
  const chartRef = useRef(null);
  const [primaryResult, setPrimaryResult] = useState(null);
  const [status, setStatus] = useState("No data yet");
  const [datasets, setDatasets] = useState([]);
  const [xLabel, setXLabel] = useState("X");
  const [yLabel, setYLabel] = useState("Y");

  // Listen to model result (fit) and preview events
  useEffect(() => {
    const onModelResult = (ev) => {
      const res = ev.detail;
      if (!res) return;
      if (res.cleared) {
        setPrimaryResult(null);
        setDatasets([]);
        setStatus("Cleared");
        setXLabel("X");
        return;
      }
      setPrimaryResult(res);
      setStatus(`Computed ${res.model || "model"}`);
      if (res.xKeys && res.xKeys[0]) setXLabel(res.xKeys[0]);
      else setXLabel("X");
      setYLabel("Y");
    };

    const onDataPreview = (ev) => {
      const payload = ev.detail || {};
      if (payload.y && payload.x && payload.xKeys) {
        // only set preview if there's no real model result
        setPrimaryResult((cur) => {
          if (cur && cur.model && cur.model !== "preview") return cur;
          setStatus("Data preview");
          setXLabel(payload.xKeys[0] || "X");
          return {
            ok: true,
            y: payload.y,
            x: payload.x,
            xKeys: payload.xKeys,
            model: "preview",
          };
        });
      }
    };

    window.addEventListener("curvelab:modelResult", onModelResult);
    window.addEventListener("curvelab:dataPreview", onDataPreview);

    return () => {
      window.removeEventListener("curvelab:modelResult", onModelResult);
      window.removeEventListener("curvelab:dataPreview", onDataPreview);
    };
    // eslint-disable-next-line
  }, []);

  // build datasets when primary result changes
  useEffect(() => {
    if (!primaryResult) {
      setDatasets([]);
      return;
    }
    const { datasets: ds } = buildDatasetsForAllX(primaryResult);
    setDatasets(ds || []);
  }, [primaryResult]);

  const exportPNG = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const url = chart.toBase64Image();
      const a = document.createElement("a");
      a.href = url;
      a.download = "curvelab-plot.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const resetZoom = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      if (typeof chart.resetZoom === "function") chart.resetZoom();
    } catch (err) {}
  };

  const data = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 8, right: 8, bottom: 36, left: 8 },
    },
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, boxWidth: 10 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const x = context.raw?.x;
            const y = context.raw?.y;
            if (x === undefined || y === undefined) return "";
            return `x: ${Number(x).toPrecision(6)}, y: ${Number(y).toPrecision(6)}`;
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: "xy", modifierKey: "ctrl" },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "xy",
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xLabel, padding: { top: 6 } },
        ticks: { precision: 3 },
        grid: { color: gridColor() },
      },
      y: {
        type: "linear",
        title: { display: true, text: yLabel, padding: { bottom: 6 } },
        grid: { color: gridColor() },
      },
    },
    interaction: { mode: "nearest", axis: "xy", intersect: false },
  };

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Graph</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPNG}
            className="px-3 py-1 rounded-md font-medium border border-border bg-transparent text-textDim hover:text-accent transition-all text-sm"
          >
            Export PNG
          </button>

          <button
            onClick={resetZoom}
            className="px-3 py-1 rounded-md font-medium border border-border bg-transparent text-textDim hover:text-accent transition-all text-sm"
            title="Reset zoom/pan"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      <div className="flex-1 border rounded bg-surface dark:bg-darkSurface overflow-hidden p-1">
        <div style={{ height: "100%", minHeight: 260 }}>
          <Scatter ref={chartRef} data={data} options={options} />
        </div>
      </div>

      <div className="mt-2 text-sm text-textDim flex items-center justify-between">
        <div>{status}</div>
        <div>
          <small>Tip: hold Ctrl and drag (or use mouse wheel / pinch) to zoom.</small>
        </div>
      </div>
    </div>
  );
}
