// src/engine/mathEngine.js
// Patched to allow negative/zero inputs WITHOUT throwing model errors.
// Invalid domains produce NaN in computations instead of failing.
// Adds domainWarnings[] for OutputSummary to display.

import extractData from "./extractData";

/* ------------------------------------------------------------
   Basic helpers
------------------------------------------------------------ */
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const r2Score = (y, yPred) => {
  const ym = mean(y);
  const ssTot = y.reduce((acc, yi) => acc + (yi - ym) ** 2, 0);
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - yPred[i]) ** 2, 0);
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
};

const rmse = (residuals) =>
  Math.sqrt(residuals.reduce((acc, r) => acc + r * r, 0) / residuals.length);

function safeLog(v, fnName = "log") {
  if (typeof v !== "number" || !isFinite(v)) return NaN;
  if (v <= 0) return NaN;
  return fnName === "ln"
    ? Math.log(v)
    : fnName === "log2"
    ? Math.log2(v)
    : Math.log10(v);
}

/* ------------------------------------------------------------
   Gaussian elimination for normal equations
------------------------------------------------------------ */
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) return null;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    const pivot = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const f = M[r][i];
        for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
      }
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
    return { ok: false, error: "Linear regression requires one X column." };

  const X = x[0];
  const n = y.length;

  const mx = mean(X);
  const my = mean(y);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (X[i] - mx) * (y[i] - my);
    den += (X[i] - mx) ** 2;
  }
  if (den === 0) return { ok: false, error: "Cannot compute slope." };

  const m = num / den;
  const c = my - m * mx;

  const yPred = X.map((xi) => m * xi + c);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "linear",
    coefficients: { m, c, a: m, b: c },
    equation: "y = m x + c",
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   POLYNOMIAL
------------------------------------------------------------ */
function polynomialFit(data, degree) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Polynomial regression requires one X column." };

  const X = x[0];
  const n = y.length;
  if (n <= degree)
    return { ok: false, error: "Not enough points for polynomial." };

  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: degree + 1 }, (_, p) => X[i] ** p)
  );

  const AT = A[0].map((_, col) => A.map((row) => row[col]));
  const ATA = AT.map((rowI, i) =>
    AT.map((colJ, j) => rowI.reduce((s, v, k) => s + v * AT[j][k], 0))
  );
  const ATy = AT.map((row) => row.reduce((s, v, k) => s + v * y[k], 0));
  const coeffs = solveLinearSystem(ATA, ATy) || Array(degree + 1).fill(NaN);

  const yPred = X.map((xi) =>
    coeffs.reduce((acc, c, p) => acc + c * xi ** p, 0)
  );
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "polynomial",
    degree,
    coefficients: coeffs,
    equation: Array.from(coeffs)
      .map((c, i) => (i === 0 ? `${c}` : `${c} x^${i}`))
      .join(" + "),
    stats: { r2: r2Score(y, yPred), rmse: rmse(residuals), n },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   EXPONENTIAL (safe mode)
   Y = a e^(bX)
------------------------------------------------------------ */
function exponentialFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Exponential requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const lnY = y.map((v, i) => {
    if (v <= 0) domainWarnings.push(`Y[${i}] = ${v} <= 0 (ln invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lin = linearFit({ y: lnY, x: [X], xKeys });

  const b = lin.coefficients.m;
  const a = Math.exp(lin.coefficients.c);

  const yPred = X.map((xi) => a * Math.exp(b * xi));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "exponential",
    coefficients: { a, b },
    equation: `y = a e^(b x)`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   POWER LAW (safe)
   y = a x^b
------------------------------------------------------------ */
function powerLawFit(data) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Power law requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const lnX = X.map((v, i) => {
    if (v <= 0) domainWarnings.push(`X[${i}] = ${v} <= 0 (log invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lnY = y.map((v, i) => {
    if (v <= 0) domainWarnings.push(`Y[${i}] = ${v} <= 0 (log invalid)`);
    return v > 0 ? Math.log(v) : NaN;
  });

  const lin = linearFit({ y: lnY, x: [lnX], xKeys });

  const b = lin.coefficients.m;
  const a = Math.exp(lin.coefficients.c);

  const yPred = X.map((xi, i) => (xi > 0 ? a * xi ** b : NaN));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "powerlaw",
    coefficients: { a, b },
    equation: `y = a x^b`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   LOGARITHMIC (safe)
   y = a log_base(x) + b
------------------------------------------------------------ */
function logarithmicFit(data, base) {
  const { y, x, xKeys } = data;
  if (x.length !== 1)
    return { ok: false, error: "Logarithmic requires one X column." };

  const X = x[0];
  const domainWarnings = [];

  const logFn =
    base === "ln"
      ? (v) => safeLog(v, "ln")
      : base === "log2"
      ? (v) => safeLog(v, "log2")
      : (v) => safeLog(v, "log10");

  const logX = X.map((v, i) => {
    if (v <= 0) domainWarnings.push(`X[${i}] = ${v} <= 0 (log invalid)`);
    return logFn(v);
  });

  const lin = linearFit({ y, x: [logX], xKeys });

  const a = lin.coefficients.m;
  const b = lin.coefficients.c;

  const yPred = logX.map((lx) => a * lx + b);
  const residuals = y.map((yi, i) => yi - yPred[i]);

  return {
    ok: true,
    model: "logarithmic",
    coefficients: { a, b, base },
    equation: `y = a log_${base}(x) + b`,
    domainWarnings,
    stats: {
      r2: r2Score(y, yPred),
      rmse: rmse(residuals),
      n: y.length,
    },
    yPred,
    residuals,
    x: data.x,
    y: data.y,
  };
}

/* ------------------------------------------------------------
   INTERPOLATION
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
    info: "Piecewise linear interpolation",
    x: data.x,
    y: data.y,
    xKeys: data.xKeys,
  };
}

/* ------------------------------------------------------------
   MAIN ROUTER
------------------------------------------------------------ */
export default function runModel(rows, columns, cfg = { model: "linear" }) {
  const extracted = extractData(rows, columns);
  if (!extracted.ok) return extracted;

  const model = (cfg && cfg.model) || "linear";

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
