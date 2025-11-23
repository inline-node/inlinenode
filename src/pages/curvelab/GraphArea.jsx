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
  Visual rules:
  - Data points: CYAN (#0ea5e9)
  - Fit curves (all models, incl interpolation): ORANGE (#f97316)
  - Overlays: dashed orange
*/

const COLOR_DATA = "#0ea5e9";
const COLOR_FIT = "#f97316";
const COLOR_OVERLAY = "#f97316";

function extractLinearCoeffs(coeffs) {
  if (!coeffs) return null;
  if (coeffs.m != null && coeffs.c != null) return { m: coeffs.m, c: coeffs.c };
  if (coeffs.a != null && coeffs.b != null) return { m: coeffs.a, c: coeffs.b };
  if (Array.isArray(coeffs) && coeffs.length >= 2)
    return { m: coeffs[1], c: coeffs[0] };
  return null;
}

function evalPolynomial(coeffArray, xv) {
  if (!Array.isArray(coeffArray)) return NaN;
  return coeffArray.reduce((s, c, p) => s + c * Math.pow(xv, p), 0);
}

function sampleCurve(result, sampleCount = 300) {
  if (!result || !result.ok) return { xs: [], ys: [] };

  const model = result.model;
  const xCols = result.x || [];
  const X = xCols[0] || [];
  if (!X.length) return { xs: [], ys: [] };

  const xmin = Math.min(...X);
  const xmax = Math.max(...X);
  const xs = [];
  const ys = [];

  const coeffs = result.coefficients;

  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const xv = xmin + (xmax - xmin) * t;
    let yv = NaN;

    if (model === "polynomial") {
      yv = evalPolynomial(coeffs, xv);
    } else if (model === "linear") {
      const lc = extractLinearCoeffs(coeffs);
      if (lc) yv = lc.m * xv + lc.c;
      else if (result.yPred && result.yPred.length === X.length) {
        // fallback interpolation from predicted
        const iPos = ((xv - xmin) / (xmax - xmin)) * (X.length - 1);
        const i0 = Math.floor(iPos),
          i1 = Math.min(X.length - 1, i0 + 1);
        const tfrac = iPos - i0;
        yv =
          result.yPred.length && result.yPred[i0] !== undefined
            ? result.yPred[i0] * (1 - tfrac) + result.yPred[i1] * tfrac
            : NaN;
      }
    } else if (model === "exponential") {
      if (coeffs && coeffs.a != null && coeffs.b != null)
        yv = coeffs.a * Math.exp(coeffs.b * xv);
    } else if (model === "powerlaw") {
      if (coeffs && coeffs.a != null && coeffs.b != null)
        yv = coeffs.a * Math.pow(xv, coeffs.b);
    } else if (model === "logarithmic") {
      const base = coeffs?.base || result?.logBase || "log10";
      const logFn =
        base === "ln" ? Math.log : base === "log2" ? Math.log2 : Math.log10;
      if (coeffs && coeffs.a != null && coeffs.b != null)
        yv = coeffs.a * logFn(xv) + coeffs.b;
    } else if (model === "interpolation") {
      // guard: interpolation returns points (x,y), so we'll sample by linear segments
      if (result.points && result.points.length) {
        // not used here — handled separately
      }
    }

    xs.push(Number(xv));
    ys.push(Number(yv));
  }

  return { xs, ys };
}

function buildDatasets(primaryResult, overlayResults = []) {
  if (!primaryResult || !primaryResult.ok) return { datasets: [], meta: {} };

  const datasets = [];
  const xCols = primaryResult.x || [];
  const yArr = primaryResult.y || [];
  const xKeys = primaryResult.xKeys || [];

  // Data scatter(s) - always cyan
  for (let ci = 0; ci < xCols.length; ci++) {
    const pts = [];
    for (let i = 0; i < xCols[ci].length; i++) {
      pts.push({ x: Number(xCols[ci][i]), y: Number(yArr[i]) });
    }
    datasets.push({
      label: `Data — ${xKeys[ci] || `X${ci + 1}`}`,
      data: pts,
      showLine: false,
      pointRadius: 3,
      backgroundColor: COLOR_DATA,
      borderColor: COLOR_DATA,
      order: 2,
    });
  }

  // Primary fit (orange)
  if (primaryResult.model && primaryResult.model !== "interpolation") {
    const { xs, ys } = sampleCurve(primaryResult, 300);
    if (xs.length) {
      const pts = xs.map((xv, i) => ({ x: xv, y: ys[i] }));
      datasets.push({
        label: `Fit — ${primaryResult.model}`,
        data: pts,
        showLine: true,
        fill: false,
        borderColor: COLOR_FIT,
        backgroundColor: COLOR_FIT,
        pointRadius: 0,
        tension: primaryResult.model === "linear" ? 0 : 0.25,
        order: 1,
      });
    } else if (
      primaryResult.yPred &&
      xCols[0] &&
      primaryResult.yPred.length === xCols[0].length
    ) {
      const pts = xCols[0].map((xv, i) => ({
        x: Number(xv),
        y: Number(primaryResult.yPred[i]),
      }));
      datasets.push({
        label: `Fit — ${primaryResult.model}`,
        data: pts,
        showLine: true,
        fill: false,
        borderColor: COLOR_FIT,
        backgroundColor: COLOR_FIT,
        pointRadius: 0,
        tension: 0.25,
        order: 1,
      });
    }
  } else if (primaryResult.model === "interpolation" && primaryResult.points) {
    const pts = primaryResult.points.map((p) => ({ x: p.x, y: p.y }));
    datasets.push({
      label: "Interpolation (primary)",
      data: pts,
      showLine: true,
      fill: false,
      borderColor: COLOR_FIT,
      backgroundColor: COLOR_FIT,
      pointRadius: 0,
      tension: 0,
      order: 1,
    });
  }

  // Overlays (dashed orange)
  overlayResults.forEach((res, idx) => {
    if (!res || !res.ok) return;
    if (res.model === "interpolation" && res.points) {
      const pts = res.points.map((p) => ({ x: p.x, y: p.y }));
      datasets.push({
        label: `Overlay interp ${idx + 1}`,
        data: pts,
        showLine: true,
        fill: false,
        borderColor: COLOR_OVERLAY,
        backgroundColor: COLOR_OVERLAY,
        pointRadius: 0,
        tension: 0,
        borderDash: [6, 4],
        order: 1,
      });
    } else {
      const { xs, ys } = sampleCurve(res, 300);
      if (xs.length) {
        const pts = xs.map((xv, i) => ({ x: xv, y: ys[i] }));
        datasets.push({
          label: `Overlay fit ${idx + 1}`,
          data: pts,
          showLine: true,
          fill: false,
          borderColor: COLOR_OVERLAY,
          backgroundColor: COLOR_OVERLAY,
          pointRadius: 0,
          tension: res.model === "linear" ? 0 : 0.25,
          borderDash: [6, 4],
          order: 1,
        });
      }
    }
  });

  return {
    datasets,
    meta: { xKeys: xKeys[0] || "X", model: primaryResult.model },
  };
}

export default function GraphArea() {
  const chartRef = useRef(null);
  const [primaryResult, setPrimaryResult] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [status, setStatus] = useState("No data yet");
  const [datasets, setDatasets] = useState([]);
  const [xLabel, setXLabel] = useState("X");
  const [yLabel, setYLabel] = useState("Y");

  // Listen to model result (fit) and preview
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
      // Use xKeys from model; don't let preview override this later
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

  // Build datasets whenever primaryResult or overlays change
  useEffect(() => {
    if (!primaryResult) {
      setDatasets([]);
      return;
    }
    const { datasets: ds } = buildDatasets(primaryResult, overlays);
    setDatasets(ds);
  }, [primaryResult, overlays]);

  const addOverlayFromPrimary = () => {
    if (!primaryResult) return;
    setOverlays((o) => [...o, primaryResult]);
    setStatus((s) => `${s} — overlay added`);
  };

  const clearOverlays = () => {
    setOverlays([]);
    setStatus((s) => s.replace(" — overlay added", ""));
  };

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
      padding: { top: 8, right: 8, bottom: 36, left: 8 }, // bottom padding ensures X label fits
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
            return `x: ${Number(x).toPrecision(6)}, y: ${Number(y).toPrecision(
              6
            )}`;
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
      },
      y: {
        type: "linear",
        title: { display: true, text: yLabel, padding: { bottom: 6 } },
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
            onClick={addOverlayFromPrimary}
            disabled={!primaryResult}
            className="px-3 py-1 rounded-md font-medium border border-border bg-transparent text-textDim hover:text-accent transition-all text-sm"
            title="Add current fit to overlays"
          >
            Add Overlay
          </button>

          <button
            onClick={clearOverlays}
            className="px-3 py-1 rounded-md font-medium border border-border bg-transparent text-textDim hover:text-accent transition-all text-sm"
          >
            Clear Overlays
          </button>

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
          <small>
            Tip: hold Ctrl and drag (or use mouse wheel / pinch) to zoom.
          </small>
        </div>
      </div>
    </div>
  );
}
