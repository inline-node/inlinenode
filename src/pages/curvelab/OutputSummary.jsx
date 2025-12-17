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
    const coeffsArr = Array.isArray(result.coefficientsArray)
      ? result.coefficientsArray
      : null;

    const isMulti = coeffsArr && coeffsArr.length > 2;

    if (isMulti) {
      const terms = [];
      for (let i = 1; i < coeffsArr.length; i++) {
        terms.push(`m${i}x${i}`);
      }
      lines.push(`  y = c + ${terms.join(" + ")}`);
    } else {
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
    const coeffsArr = Array.isArray(result.coefficientsArray)
      ? result.coefficientsArray
      : null;

    const isMulti = coeffsArr && coeffsArr.length > 2;

    /* =======================
      Coefficients
      ======================= */
    lines.push("Coefficients");

    if (isMulti) {
      lines.push(`c (intercept): ${formatNum(coeffsArr[0])}`);

      for (let i = 1; i < coeffsArr.length; i++) {
        lines.push(`m${i} (X${i}): ${formatNum(coeffsArr[i])}`);
      }

      lines.push("");
      const expanded = [];
      for (let i = 1; i < coeffsArr.length; i++) {
        expanded.push(`${formatNum(coeffsArr[i])}x${i}`);
      }
      lines.push(`y = ${formatNum(coeffsArr[0])} + ${expanded.join(" + ")}`);
    } else {
      const m =
        result.coefficients?.m ?? result.coefficients?.a ?? coeffsArr?.[1];
      const c =
        result.coefficients?.c ?? result.coefficients?.b ?? coeffsArr?.[0];

      lines.push(`m: ${formatNum(m)}`);
      lines.push(`c: ${formatNum(c)}`);
      lines.push("");
      lines.push(`y = ${formatNum(m)}x + ${formatNum(c)}`);
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
      console.log("MODEL RESULT (debug):", r);
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
      // Use array-form coefficients if provided by engine (coefficientsArray),
      // else fall back to coefficients object for single-variable outputs.
      const coeffs = Array.isArray(result.coefficientsArray)
        ? result.coefficientsArray
        : result.coefficients;

      if (Array.isArray(coeffs) && coeffs.length > 2) {
        const parts = ["c"];
        for (let i = 1; i < coeffs.length; i++) {
          const name = i === 1 ? "x" : `x${i - 1}`;
          parts.push(`m${i}·${name}`);
        }
        return "y = " + parts.join(" + ");
      }
      // single variable fallback
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
    // Prefer array if present, else object
    const coeffsArr = Array.isArray(result.coefficientsArray)
      ? result.coefficientsArray
      : null;
    const coeffsObj = coeffsArr ? null : result.coefficients || null;

    /* LINEAR */
    if (result.model === "linear") {
      const multiX = Array.isArray(result.x) && result.x.length > 1;

      // MULTIVARIABLE (array-form)
      if (coeffsArr && coeffsArr.length > 2) {
        return (
          <div className="mt-3">
            <div className="text-sm font-medium">Coefficients</div>

            <div className="mt-1 p-2 bg-surface/30 rounded text-sm font-mono">
              <div>c (intercept): {formatNum(coeffsArr[0])}</div>
              {coeffsArr.slice(1).map((v, i) => {
                const name = i === 0 ? "x" : `x${i}`;
                return (
                  <div key={i}>
                    m{i + 1} ({name}): {formatNum(v)}
                  </div>
                );
              })}
            </div>

            <div className="mt-1 p-2 bg-surface/30 rounded text-sm font-mono">
              {(() => {
                const intercept = formatNum(coeffsArr[0]);
                const parts = [];
                for (let i = 1; i < coeffsArr.length; i++) {
                  const name = i === 1 ? "x" : `x${i - 1}`;
                  parts.push(`${formatNum(coeffsArr[i])}·${name}`);
                }
                return `y = ${intercept} + ${parts.join(" + ")}`;
              })()}
            </div>

            <div className="mt-2 text-xs text-textDim">
              No fit line shown because multivariable regression cannot be
              plotted in 2D.
            </div>
          </div>
        );
      }

      // MULTIVARIABLE (object-form fallback) — some older flows may produce coeff object
      if (
        !coeffsArr &&
        coeffsObj &&
        Object.keys(coeffsObj).some((k) => /^m\d+$/i.test(k))
      ) {
        // build array-like view for display without changing engine
        const keys = Object.keys(coeffsObj).filter((k) => k !== "c");
        // sort m1,m2,m3...
        keys.sort((a, b) => {
          const na = a.match(/^m(\d+)$/i)?.[1] || "0";
          const nb = b.match(/^m(\d+)$/i)?.[1] || "0";
          return Number(na) - Number(nb);
        });
        return (
          <div className="mt-3">
            <div className="text-sm font-medium">Coefficients</div>
            <div className="mt-1 p-2 bg-surface/30 rounded text-sm font-mono">
              <div>
                c (intercept):{" "}
                {formatNum(coeffsObj.c ?? coeffsObj.intercept ?? "—")}
              </div>
              {keys.map((k, idx) => (
                <div key={k}>
                  {k}: {formatNum(coeffsObj[k])}
                </div>
              ))}
            </div>

            <div className="mt-3 text-sm font-medium">Expanded Equation</div>
            <div className="mt-1 p-2 bg-surface/30 rounded text-sm font-mono">
              {(() => {
                const intercept = formatNum(
                  coeffsObj.c ?? coeffsObj.intercept ?? 0
                );
                const parts = keys.map(
                  (k) => `${formatNum(coeffsObj[k])}·${k}`
                );
                return `y = ${intercept} + ${parts.join(" + ")}`;
              })()}
            </div>

            <div className="mt-2 text-xs text-textDim">
              No fit line shown because multivariable regression cannot be
              plotted in 2D.
            </div>
          </div>
        );
      }

      // SINGLE VARIABLE fallback (original path)
      const singleM = coeffsObj
        ? coeffsObj.m ?? coeffsObj.a ?? undefined
        : undefined;
      const singleC = coeffsObj
        ? coeffsObj.c ?? coeffsObj.b ?? undefined
        : undefined;
      const m =
        singleM ??
        (Array.isArray(result.coefficients)
          ? result.coefficients[1]
          : undefined);
      const c =
        singleC ??
        (Array.isArray(result.coefficients)
          ? result.coefficients[0]
          : undefined);

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
