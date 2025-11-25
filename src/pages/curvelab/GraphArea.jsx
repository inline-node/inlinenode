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
import runModel from "../../engine/mathEngine";

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

/* ------------------------------------------------------------
   Color palette per X-column — deterministic & accessible
------------------------------------------------------------ */
const PALETTE = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // green
  "#eab308", // yellow
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // teal
  "#fb7185", // rose
];

function gridColor() {
  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
}

/* ------------------------------------------------------------
   Sampling functions
------------------------------------------------------------ */

function evalPolynomial(coeffs, x) {
  if (!Array.isArray(coeffs)) return NaN;
  return coeffs.reduce((sum, c, p) => sum + c * Math.pow(x, p), 0);
}

function sampleCurvePerX(modelResult, xValues, sampleCount = 300) {
  if (!modelResult?.ok || !xValues?.length) return { xs: [], ys: [] };

  const coeffs = modelResult.coefficients || {};
  const model = modelResult.model;

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);
  if (!isFinite(min) || !isFinite(max)) return { xs: [], ys: [] };

  const xs = [];
  const ys = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const xv = min + (max - min) * t;
    let yv = NaN;

    if (model === "linear") {
      const m = coeffs.m ?? coeffs.a ?? (Array.isArray(coeffs) ? coeffs[1] : undefined);
      const c = coeffs.c ?? coeffs.b ?? (Array.isArray(coeffs) ? coeffs[0] : undefined);
      if (m !== undefined && c !== undefined) yv = m * xv + c;
    } else if (model === "polynomial") {
      yv = evalPolynomial(coeffs, xv);
    } else if (model === "exponential") {
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * Math.exp(coeffs.b * xv);
    } else if (model === "powerlaw") {
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * Math.pow(xv, coeffs.b);
    } else if (model === "logarithmic") {
      const base = coeffs.base || "log10";
      const logFn =
        base === "ln" ? Math.log : base === "log2" ? Math.log2 : Math.log10;
      if (coeffs.a != null && coeffs.b != null) yv = coeffs.a * logFn(xv) + coeffs.b;
    }

    xs.push(xv);
    ys.push(yv);
  }

  return { xs, ys };
}

/* ------------------------------------------------------------
   Build datasets (MAIN FEATURE!)
------------------------------------------------------------ */

function buildDatasets(result) {
  if (!result?.ok) return [];

  const xCols = result.x || [];
  const yArr = result.y || [];
  const xKeys = result.xKeys || [];

  const datasets = [];

  for (let i = 0; i < xCols.length; i++) {
    const xcol = xCols[i] || [];
    const labelX = xKeys[i] || `X${i + 1}`;
    const color = PALETTE[i % PALETTE.length];

    /* --- 1. Scatter plot (user data) --- */
    const scatter = xcol.map((x, index) => ({
      x: Number(x),
      y: Number(yArr[index]),
    }));

    datasets.push({
      label: `Data — ${labelX}`,
      data: scatter,
      showLine: false,
      pointRadius: 3,
      backgroundColor: color,
      borderColor: color,
      pointStyle: "circle",
      order: 2,
    });

    /* --- 2. FIT LINE for this X column --- */
    let fit = null;

    try {
      // Create synthetic table for this column only
      const rows = xcol.map((xv, idx) => ({
        Y: yArr[idx],
        X: xv,
      }));

      const cols = [
        { key: "Y", label: "Y" },
        { key: "X", label: labelX },
      ];

      const cfg =
        window.__curvelab_modelConfig ||
        JSON.parse(localStorage.getItem("curvelab.modelConfig") || "{}");

      if (cfg?.model) {
        const out = runModel(rows, cols, cfg);
        if (out?.ok) fit = out;
      }
    } catch {
      fit = null;
    }

    if (fit && fit.model !== "interpolation") {
      // ONLY draw the primary curve if there is exactly ONE X column
      if (result.x.length === 1) {
        const { xs, ys } = sampleCurve(result, result.x[0], 300);
        if (xs.length) {
          const fitPts = xs.map((xv, idx) => ({
            x: xv,
            y: ys[idx],
          }));
          datasets.push({
            label: `Fit — ${xKeys[0] || "X"}`,
            data: fitPts,
            showLine: true,
            fill: false,
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f6",
            pointRadius: 0,
            tension: result.model === "linear" ? 0 : 0.25,
            borderWidth: 2,
            order: 1,
          });
        }
      }
    }

    /* --- 3. Interpolation (only for X1) --- */
    if (result.model === "interpolation" && i === 0) {
      const pts = result.points?.map((p) => ({
        x: Number(p.x),
        y: Number(p.y),
      })) || scatter;

      datasets.push({
        label: `Interpolation — ${labelX}`,
        data: pts.sort((a, b) => a.x - b.x),
        showLine: true,
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        pointRadius: 0,
        tension: 0,
        borderWidth: 2,
        order: 1,
      });
    }
  }

  return datasets;
}

/* ------------------------------------------------------------
   Component
------------------------------------------------------------ */

export default function GraphArea() {
  const chartRef = useRef(null);
  const [primaryResult, setPrimaryResult] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [status, setStatus] = useState("No data yet");
  const [xLabel, setXLabel] = useState("X");
  const [yLabel] = useState("Y");

  useEffect(() => {
    const onModelResult = (ev) => {
      const r = ev.detail;
      if (!r) return;

      if (r.cleared) {
        setPrimaryResult(null);
        setDatasets([]);
        setStatus("Cleared");
        setXLabel("X");
        return;
      }

      setPrimaryResult(r);
      setStatus(`Computed — ${r.model}`);

      if (r.xKeys?.length) setXLabel(r.xKeys[0]);
    };

    const onPreview = (ev) => {
      const p = ev.detail;
      if (!p?.x || !p.y) return;

      setPrimaryResult((prev) => {
        if (prev?.model !== "preview") return prev;

        setStatus("Preview");
        setXLabel(p.xKeys[0] || "X");

        return {
          ok: true,
          x: p.x,
          y: p.y,
          xKeys: p.xKeys,
          model: "preview",
        };
      });
    };

    window.addEventListener("curvelab:modelResult", onModelResult);
    window.addEventListener("curvelab:dataPreview", onPreview);

    return () => {
      window.removeEventListener("curvelab:modelResult", onModelResult);
      window.removeEventListener("curvelab:dataPreview", onPreview);
    };
  }, []);

  useEffect(() => {
    if (!primaryResult) return setDatasets([]);

    setDatasets(buildDatasets(primaryResult));
  }, [primaryResult]);

  const exportPNG = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image();
    const a = document.createElement("a");
    a.href = url;
    a.download = "curvelab-plot.png";
    a.click();
  };

  const resetZoom = () => {
    const chart = chartRef.current;
    if (chart?.resetZoom) chart.resetZoom();
  };

  /* ------------------------------------------------------------
     Chart.js Options
------------------------------------------------------------ */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (c) =>
            `x=${Number(c.raw.x).toPrecision(6)}, y=${Number(
              c.raw.y
            ).toPrecision(6)}`,
        },
      },
      zoom: {
        pan: { enabled: true, mode: "xy", modifierKey: "ctrl" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xLabel },
        grid: { color: gridColor() },
      },
      y: {
        type: "linear",
        title: { display: true, text: yLabel },
        grid: { color: gridColor() },
      },
    },
  };

  /* ------------------------------------------------------------
     RENDER
------------------------------------------------------------ */
  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Graph</h2>

        <div className="flex gap-2">
          <button
            onClick={exportPNG}
            className="px-3 py-1 border rounded-md text-textDim hover:text-accent text-sm"
          >
            Export PNG
          </button>

          <button
            onClick={resetZoom}
            className="px-3 py-1 border rounded-md text-textDim hover:text-accent text-sm"
          >
            Reset Zoom
          </button>
        </div>
      </div>

      <div className="flex-1 border rounded bg-surface dark:bg-darkSurface p-1">
        <Scatter ref={chartRef} data={{ datasets }} options={options} />
      </div>

      <div className="mt-2 text-sm text-textDim">{status}</div>
    </div>
  );
}
