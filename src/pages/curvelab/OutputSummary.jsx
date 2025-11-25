import React, { useEffect, useState } from "react";

/* ---------------- Formatting helpers ---------------- */

function formatNum(v, prec = 12) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e6 || (Math.abs(n) !== 0 && Math.abs(n) <= 1e-6))
    return n.toExponential(prec - 1);
  return n.toString();
}

function joinArrayLine(arr, fmt = (x) => String(x)) {
  if (!Array.isArray(arr)) return "—";
  return arr.map(fmt).join(", ");
}

/* -------- Interpolation segment builder -------- */

function buildInterpolationSegmentsFromPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const pts = [...points].map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  pts.sort((a, b) => a.x - b.x);
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const m = dx === 0 ? NaN : (p1.y - p0.y) / dx;
    const c = p0.y - (isNaN(m) ? 0 : m * p0.x);
    segs.push({
      index: i + 1,
      x0: p0.x,
      y0: p0.y,
      x1: p1.x,
      y1: p1.y,
      m,
      c,
    });
  }
  return segs;
}

/* ---------------- FULL REPORTS (.txt) ---------------- */

function buildRegressionReportText(result) {
  const lines = [];
  const model = (result.model || "MODEL").toUpperCase();
  lines.push(`InlineNode CurveLab — ${model} REPORT`);
  lines.push(`Generated on: ${new Date().toLocaleString()}`);
  lines.push("https://inlinenode.com/curvelab");
  lines.push("");

  /* EQUATION (symbolic only!) */
  lines.push("Equation:");
  if (result.model === "linear") {
    const coeffs = result.coefficients;
  
    // MULTIVARIABLE: coefficients array
    if (Array.isArray(coeffs) && coeffs.length > 2) {
      const eqParts = [];
      for (let i = 1; i < coeffs.length; i++) {
        eqParts.push(`a${i} X${i}`);
      }
      eqParts.push("c");
      lines.push("  y = " + eqParts.join(" + "));
    }
    // SINGLE VARIABLE
    else {
      lines.push("  y = m x + c");
    }
  } else if (result.model === "polynomial") {
    const deg = (result.coefficients || []).length - 1;
    const parts = [];
    for (let i = 0; i <= deg; i++) parts.push(`a${i} x^${i}`);
    lines.push("  y = " + parts.join(" + "));
  } else if (result.model === "exponential") {
    lines.push("  y = a e^(b x)");
  } else if (result.model === "powerlaw") {
    lines.push("  y = a x^b");
  } else if (result.model === "logarithmic") {
    const base = result.coefficients.base || "log10";
    lines.push(`  y = a ${base}(x) + b`);
  } else {
    lines.push("  " + (result.equation || "—"));
  }
  lines.push("");

  /* COEFFICIENTS WITH IMPLEMENTATION */
  lines.push("Coefficients:");

  if (result.model === "linear") {
    const coeffs = result.coefficients;
  
    // MULTIVARIABLE CASE
    if (Array.isArray(coeffs) && coeffs.length > 2) {
      lines.push("  c = " + formatNum(coeffs[0]));
      for (let i = 1; i < coeffs.length; i++) {
        lines.push(`  a${i} = ${formatNum(coeffs[i])}`);
      }
      lines.push("");
      lines.push("Implementation:");
      const impl = coeffs
        .map((v, i) => (i === 0 ? `${formatNum(v)}` : `${formatNum(v)} X${i}`))
        .join(" + ");
      lines.push(`  y = ${impl}`);
    }
  
    // SINGLE VARIABLE CASE
    else {
      const m =
        coeffs.m ?? coeffs.a ?? (Array.isArray(coeffs) ? coeffs[1] : undefined);
      const c =
        coeffs.c ?? coeffs.b ?? (Array.isArray(coeffs) ? coeffs[0] : undefined);
  
      lines.push(`  m = ${formatNum(m)}`);
      lines.push(`  c = ${formatNum(c)}`);
      lines.push("");
      lines.push("Implementation:");
      lines.push(`  y = ${formatNum(m)} x + ${formatNum(c)}`);
    }
  } else if (result.model === "polynomial") {
    const arr = result.coefficients || [];
    arr.forEach((v, i) => lines.push(`  a${i} = ${formatNum(v)}`));
    lines.push("");
    const impl = arr.map((v, i) => `${formatNum(v)} x^${i}`).join(" + ");
    lines.push("Implementation:");
    lines.push(`  y = ${impl}`);
  } else if (result.model === "exponential") {
    const { a, b } = result.coefficients;
    lines.push(`  a = ${formatNum(a)}`);
    lines.push(`  b = ${formatNum(b)}`);
    lines.push("");
    lines.push("Implementation:");
    lines.push(`  y = ${formatNum(a)} e^(${formatNum(b)} x)`);
  } else if (result.model === "powerlaw") {
    const { a, b } = result.coefficients;
    lines.push(`  a = ${formatNum(a)}`);
    lines.push(`  b = ${formatNum(b)}`);
    lines.push("");
    lines.push("Implementation:");
    lines.push(`  y = ${formatNum(a)} x^(${formatNum(b)})`);
  } else if (result.model === "logarithmic") {
    const { a, b, base } = result.coefficients;
    lines.push(`  a = ${formatNum(a)}`);
    lines.push(`  b = ${formatNum(b)}`);
    if (base) lines.push(`  base = ${base}`);
    lines.push("");
    lines.push("Implementation:");
    lines.push(`  y = ${formatNum(a)} ${base}(x) + ${formatNum(b)}`);
  }

  lines.push("");
  lines.push("Statistics:");
  lines.push(`  R² = ${formatNum(result.stats.r2)}`);
  lines.push(`  RMSE = ${formatNum(result.stats.rmse)}`);
  lines.push(`  n = ${result.stats.n}`);
  lines.push("");

  return lines.join("\n");
}

function buildInterpolationReportText(result) {
  const lines = [];
  lines.push("InlineNode CurveLab — INTERPOLATION REPORT");
  lines.push(`Generated on: ${new Date().toLocaleString()}`);
  lines.push("https://inlinenode.com/curvelab");
  lines.push("");

  let pts = [];
  if (result.points) {
    pts = result.points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  } else if (result.x && result.y) {
    const X = Array.isArray(result.x[0]) ? result.x[0] : result.x;
    pts = X.map((xv, i) => ({ x: Number(xv), y: Number(result.y[i]) }));
  }

  if (pts.length < 2) {
    lines.push("Not enough points for interpolation.");
    return lines.join("\n");
  }

  const segs = buildInterpolationSegmentsFromPoints(pts);

  lines.push(`Total points: ${pts.length}`);
  lines.push(`Total segments: ${segs.length}`);
  lines.push("");
  lines.push("Segments:");
  lines.push("");

  segs.forEach((s) => {
    lines.push(`Segment ${s.index}:`);
    lines.push(`  x0 = ${formatNum(s.x0)}`);
    lines.push(`  y0 = ${formatNum(s.y0)}`);
    lines.push(`  x1 = ${formatNum(s.x1)}`);
    lines.push(`  y1 = ${formatNum(s.y1)}`);
    lines.push(`  m  = ${formatNum(s.m)}`);
    lines.push(`  c  = ${formatNum(s.c)}`);
    lines.push(`  equation: y = ${formatNum(s.m)} x + ${formatNum(s.c)}`);
    lines.push("");
  });

  return lines.join("\n");
}

/* ---------------- React Component ---------------- */

export default function OutputSummary() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const r = e.detail;
      if (!r) return;

      if (r.cleared) {
        setResult({ cleared: true });
        try {
          localStorage.removeItem("curvelab.modelResult");
        } catch {}
        return;
      }

      setResult(r);
      try {
        localStorage.setItem("curvelab.modelResult", JSON.stringify(r));
      } catch {}
    };

    window.addEventListener("curvelab:modelResult", handler);

    try {
      const saved = localStorage.getItem("curvelab.modelResult");
      if (saved) setResult(JSON.parse(saved));
    } catch {}

    return () => window.removeEventListener("curvelab:modelResult", handler);
  }, []);

  const downloadFull = () => {
    const txt =
      result && result.model === "interpolation"
        ? buildInterpolationReportText(result)
        : buildRegressionReportText(result);

    const blob = new Blob([txt], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curvelab_report_${result.model || "report"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---------------- UI RENDER ---------------- */

  if (!result) {
    return (
      <div className="p-3 h-full overflow-auto">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="mt-2 text-sm text-textDim">No results yet.</div>
      </div>
    );
  }

  if (result.cleared) {
    return (
      <div className="p-3 h-full overflow-auto">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="mt-2 text-sm text-textDim">Results cleared.</div>
      </div>
    );
  }

  if (!result.ok) {
    const errs =
      result.errors || (result.error ? [result.error] : ["Unknown error"]);
    return (
      <div className="p-3 h-full overflow-auto">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="mt-2 text-sm text-rose-500 font-medium">Error</div>
        <div className="mt-2 text-sm space-y-1">
          {errs.map((e, i) => (
            <div key={i}>{String(e)}</div>
          ))}
        </div>
      </div>
    );
  }

  const model = (result.model || "MODEL").toUpperCase();

  const renderSymbolicEquation = () => {
    if (result.model === "linear") {
      const coeffs = result.coefficients;
    
      // MULTIVARIABLE
      if (Array.isArray(coeffs) && coeffs.length > 2) {
        const parts = [];
        for (let i = 1; i < coeffs.length; i++) {
          parts.push(`a${i} X${i}`);
        }
        parts.push("c");
        return "y = " + parts.join(" + ");
      }
    
      // SINGLE VARIABLE
      return "y = m x + c";
    }
    if (result.model === "polynomial") {
      const deg = (result.coefficients || []).length - 1;
      return (
        "y = " + [...Array(deg + 1)].map((_, i) => `a${i} x^${i}`).join(" + ")
      );
    }
    if (result.model === "exponential") return "y = a e^(b x)";
    if (result.model === "powerlaw") return "y = a x^b";
    if (result.model === "logarithmic") {
      const base = result.coefficients.base || "log10";
      return `y = a ${base}(x) + b`;
    }
    return result.equation || "—";
  };

  const renderCoefficientsUI = () => {
    if (!result.coefficients) return null;
    const coeffs = result.coefficients;

    /* LINEAR */
    if (result.model === "linear") {
      const coeffs = result.coefficients;
      const multiX = Array.isArray(result.x) && result.x.length > 1;
    
      // MULTIVARIABLE CASE
      if (Array.isArray(coeffs) && coeffs.length > 2) {
        return (
          <div className="mt-3">
            <div className="text-sm font-medium">Coefficients</div>
    
            <div className="p-2 mb-2 rounded bg-rose-500/20 text-rose-400 text-xs">
              Multivariable linear regression detected.  
              The equation uses: X, X2, X3…
            </div>
    
            <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
              <div>c: {formatNum(coeffs[0])}</div>
              {coeffs.slice(1).map((v, i) => (
                <div key={i}>a{i + 1}: {formatNum(v)}</div>
              ))}
              <div className="mt-2 font-mono">
                y = {coeffs.map((v, i) =>
                  i === 0 ? `${formatNum(v)}` : `${formatNum(v)}X${i}`
                ).join(" + ")}
              </div>
            </div>
          </div>
        );
      }
    
      // SINGLE VARIABLE
      const m = coeffs.m ?? coeffs.a ?? coeffs[1];
      const c = coeffs.c ?? coeffs.b ?? coeffs[0];
    
      return (
        <div className="mt-3">
          <div className="text-sm font-medium">Coefficients</div>
          <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
            <div>m: {formatNum(m)}</div>
            <div>c: {formatNum(c)}</div>
            <div className="mt-2 font-mono">
              y = {formatNum(m)}x + {formatNum(c)}
            </div>
          </div>
        </div>
      );
    }


    /* POLYNOMIAL */
    if (result.model === "polynomial") {
      const arr = coeffs || [];
      return (
        <div className="mt-3">
          <div className="text-sm font-medium">Coefficients</div>
          <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
            {arr.map((v, i) => (
              <div key={i}>
                a{i}: {formatNum(v)}
              </div>
            ))}
            <div className="mt-2 font-mono">
              y = {arr.map((v, i) => `${formatNum(v)}x^${i}`).join(" + ")}
            </div>
          </div>
        </div>
      );
    }

    /* EXPONENTIAL */
    if (result.model === "exponential") {
      const { a, b } = coeffs;
      return (
        <div className="mt-3">
          <div className="text-sm font-medium">Coefficients</div>
          <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
            <div>a: {formatNum(a)}</div>
            <div>b: {formatNum(b)}</div>
            <div className="mt-2 font-mono">
              y = {formatNum(a)} e^({formatNum(b)}x)
            </div>
          </div>
        </div>
      );
    }

    /* POWER LAW */
    if (result.model === "powerlaw") {
      const { a, b } = coeffs;
      return (
        <div className="mt-3">
          <div className="text-sm font-medium">Coefficients</div>
          <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
            <div>a: {formatNum(a)}</div>
            <div>b: {formatNum(b)}</div>
            <div className="mt-2 font-mono">
              y = {formatNum(a)} x^({formatNum(b)})
            </div>
          </div>
        </div>
      );
    }

    /* LOGARITHMIC */
    if (result.model === "logarithmic") {
      const { a, b, base } = coeffs;
      return (
        <div className="mt-3">
          <div className="text-sm font-medium">Coefficients</div>
          <div className="mt-1 p-2 bg-surface/30 rounded text-sm">
            <div>a: {formatNum(a)}</div>
            <div>b: {formatNum(b)}</div>
            <div>base: {base}</div>
            <div className="mt-2 font-mono">
              y = {formatNum(a)} {base}(x) + {formatNum(b)}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-3 h-full overflow-auto">
      <h2 className="text-lg font-semibold">{model}</h2>

      {result.model === "interpolation" &&
        (() => {
          const X = Array.isArray(result.x?.[0]) ? result.x[0] : result.x || [];
          const Y = result.y || [];
          const segs = buildInterpolationSegmentsFromPoints(
            X.map((xv, i) => ({ x: xv, y: Y[i] }))
          );
          return (
            <div className="mt-3 p-3 bg-surface/20 rounded text-sm">
              <div className="font-medium mb-2">Interpolation Summary</div>
              <div>Points: {X.length}</div>
              <div>Segments: {segs.length}</div>
              <div>
                X Range:{" "}
                {X.length
                  ? `${formatNum(Math.min(...X))} → ${formatNum(
                      Math.max(...X)
                    )}`
                  : "—"}
              </div>
              <div>Type: Piecewise Linear</div>
            </div>
          );
        })()}

      {result.model !== "interpolation" && (
        <>
          <div className="mt-3">
            <div className="text-sm font-medium">Equation</div>
            <div className="mt-1 p-2 bg-surface/20 rounded font-mono text-sm">
              {renderSymbolicEquation()}
            </div>
          </div>

          {renderCoefficientsUI()}
        </>
      )}

      <div className="mt-3">
        <div className="text-sm font-medium">Statistics</div>
        <div className="mt-1 p-2 bg-surface/20 rounded text-sm">
          <div>R²: {result.stats ? formatNum(result.stats.r2) : "—"}</div>
          <div>RMSE: {result.stats ? formatNum(result.stats.rmse) : "—"}</div>
          <div>
            n:{" "}
            {result.model === "interpolation"
              ? Array.isArray(result.y)
                ? result.y.length
                : "—"
              : result.stats
              ? result.stats.n
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={downloadFull}
          className="px-3 py-2 rounded-md border border-border text-textDim hover:text-accent transition-all"
        >
          Download Full Report (.txt)
        </button>
      </div>
    </div>
  );
}
