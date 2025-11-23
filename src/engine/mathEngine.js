// src/engine/mathEngine.js
// Final patched version (stable) – matches OutputSummary + DataInput expectations

import extractData from "./extractData";

/* ------------------------------------------------------------
   Utility Helpers
------------------------------------------------------------ */

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const r2Score = (y, yPred) => {
  const ym = mean(y);
  const ssTot = y.reduce((acc, yi) => acc + (yi - ym) ** 2, 0);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - yPred[i]) ** 2, 0);
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
};

const rmse = (res) =>
  Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);

/* ------------------------------------------------------------
   Solve linear system (Gaussian elimination)
------------------------------------------------------------ */
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // pivot
    let maxRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) return null;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    // normalize
    const pivot = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= pivot;

    // eliminate
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= factor * M[i][c];
    }
  }
  return M.map((row) => row[n]);
}

/* ------------------------------------------------------------
   LINEAR
------------------------------------------------------------ */
function linearFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Linear fit requires one X column." };

  const X = x[0];
  const n = y.length;

  const mx = mean(X);
  const my = mean(y);

  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (X[i] - mx) * (y[i] - my);
    den += (X[i] - mx) ** 2;
  }

  if (den === 0) return { ok: false, error: "X variance is zero." };

  const m = num / den;
  const c = my - m * mx;

  const yPred = X.map((xi) => m * xi + c);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "linear",
    coefficients: { m, c },
    equation: `y = ${m}x + ${c}`,
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n },
    yPred,
    residuals,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   POLYNOMIAL
------------------------------------------------------------ */
function polynomialFit(data, degree) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Polynomial fit requires one X column." };

  const X = x[0];
  const n = y.length;

  if (n <= degree)
    return { ok: false, error: "Not enough points for polynomial." };

  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: degree + 1 }, (_, p) => X[i] ** p)
  );

  const AT = A[0].map((_, col) => A.map((row) => row[col]));
  const ATA = AT.map((row, i) =>
    AT.map((_, j) => row.reduce((s, v, k) => s + v * AT[j][k], 0))
  );
  const ATy = AT.map((row) => row.reduce((s, v, k) => s + v * y[k], 0));

  const coeffs = solveLinearSystem(ATA, ATy);
  if (!coeffs)
    return {
      ok: false,
      error: "Polynomial normal-equation matrix is singular.",
    };

  const yPred = X.map((xi) =>
    coeffs.reduce((acc, c, p) => acc + c * xi ** p, 0)
  );
  const residuals = y.map((yi, i) => yi - yPred[i]);

  const eq =
    "y = " +
    coeffs.map((c, i) => (i === 0 ? `${c}` : `${c}x^${i}`)).join(" + ");

  return {
    ok: true,
    model: "polynomial",
    degree,
    coefficients: coeffs,
    equation: eq,
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n },
    yPred,
    residuals,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   EXPONENTIAL  y = a e^(b x)
------------------------------------------------------------ */
function exponentialFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Exponential requires one X column." };

  if (y.some((v) => v <= 0)) return { ok: false, error: "Y must be > 0." };

  const X = x[0];
  const lnY = y.map((v) => Math.log(v));

  const lin = linearFit({ y: lnY, x: [X], xKeys });
  if (!lin.ok) return lin;

  const b = lin.coefficients.m;
  const a = Math.exp(lin.coefficients.c);

  const yPred = X.map((xi) => a * Math.exp(b * xi));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "exponential",
    coefficients: { a, b },
    equation: `y = ${a} e^(${b}x)`,
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n: y.length },
    yPred,
    residuals,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   POWER LAW  y = a x^b
------------------------------------------------------------ */
function powerLawFit(data) {
  const { y, x, xKeys } = data;

  if (x.length !== 1)
    return { ok: false, error: "Power law requires one X column." };

  const X = x[0];

  if (X.some((v) => v <= 0) || y.some((v) => v <= 0))
    return { ok: false, error: "X and Y must be > 0." };

  const lnX = X.map((v) => Math.log(v));
  const lnY = y.map((v) => Math.log(v));

  const lin = linearFit({ y: lnY, x: [lnX], xKeys });
  if (!lin.ok) return lin;

  const b = lin.coefficients.m;
  const a = Math.exp(lin.coefficients.c);

  const yPred = X.map((xi) => a * xi ** b);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "powerlaw",
    coefficients: { a, b },
    equation: `y = ${a} x^(${b})`,
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n: y.length },
    yPred,
    residuals,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   LOGARITHMIC  y = a log_base(x) + b
------------------------------------------------------------ */
function logarithmicFit(data, base) {
  const { y, x, xKeys } = data;

  if (x.length !== 1)
    return { ok: false, error: "Logarithmic requires one X column." };

  const X = x[0];
  if (X.some((v) => v <= 0)) return { ok: false, error: "X must be > 0." };

  const logFn =
    base === "ln"
      ? (v) => Math.log(v)
      : base === "log2"
      ? (v) => Math.log2(v)
      : (v) => Math.log10(v);

  const logX = X.map(logFn);
  const lin = linearFit({ y, x: [logX], xKeys });
  if (!lin.ok) return lin;

  const a = lin.coefficients.m;
  const b = lin.coefficients.c;

  const yPred = logX.map((lx) => a * lx + b);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "logarithmic",
    coefficients: { a, b, base },
    equation: `y = ${a} log_${base}(x) + ${b}`,
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n: y.length },
    yPred,
    residuals,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   INTERPOLATION (piecewise linear)
------------------------------------------------------------ */
function interpolationFit(data) {
  const { y, x, xKeys } = data;

  if (x.length !== 1)
    return { ok: false, error: "Interpolation requires one X column." };

  const X = x[0];
  const pts = X.map((xi, i) => ({ x: xi, y: y[i] })).sort((a, b) => a.x - b.x);

  return {
    ok: true,
    model: "interpolation",
    points: pts,
    x,
    y,
    xKeys,
  };
}

/* ------------------------------------------------------------
   MAIN ROUTER
------------------------------------------------------------ */
export default function runModel(rows, columns, cfg = { model: "linear" }) {
  const extracted = extractData(rows, columns);
  if (!extracted.ok) return extracted;

  const model = (cfg.model || "linear").toLowerCase();

  switch (model) {
    case "linear":
      return linearFit(extracted);

    case "polynomial":
      return polynomialFit(extracted, cfg.degree || 2);

    case "exponential":
      return exponentialFit(extracted);

    case "powerlaw":
      return powerLawFit(extracted);

    case "logarithmic":
      return logarithmicFit(extracted, cfg.logBase || "log10");

    case "interpolation":
      return interpolationFit(extracted);

    default:
      return { ok: false, error: `Unknown model '${model}'.` };
  }
}
