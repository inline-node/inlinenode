import Layout from "../../layouts/Layout";
import Console from "../../components/Console";
import { useState } from "react";

export default function VoltageDivider() {
  const [vin, setVin] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");
  const [vout, setVout] = useState("");
  const [unitR1, setUnitR1] = useState("ohm");
  const [unitR2, setUnitR2] = useState("ohm");
  const [steps, setSteps] = useState([]);

  const unitMultipliers = {
    ohm: 1,
    kohm: 1e3,
    Mohm: 1e6,
  };

  const parseNum = (val) => {
    if (!val || val.trim() === "") return NaN;
    const n = parseFloat(val);
    return isNaN(n) ? NaN : n;
  };

  const formatRes = (ohms) => {
    if (!isFinite(ohms)) return "NaN";
    if (Math.abs(ohms) >= 1e6) return `${(ohms / 1e6).toFixed(3)} MΩ`;
    if (Math.abs(ohms) >= 1e3) return `${(ohms / 1e3).toFixed(3)} kΩ`;
    return `${ohms.toFixed(3)} Ω`;
  };

  const handleCalculate = () => {
    setSteps([]); // clear previous steps

    const Vs = parseNum(vin);
    const R1 = parseNum(r1) * unitMultipliers[unitR1];
    const R2 = parseNum(r2) * unitMultipliers[unitR2];
    const Vout = parseNum(vout);

    const valid = {
      vin: isFinite(Vs),
      r1: isFinite(R1),
      r2: isFinite(R2),
      vout: isFinite(Vout),
    };

    const missing = Object.entries(valid)
      .filter(([_, v]) => !v)
      .map(([k]) => k);

    if (missing.length !== 1) {
      setSteps(["⚠️ Leave exactly one field empty to calculate it."]);
      return;
    }

    const newSteps = [];
    let resultValue = "";

    try {
      if (missing[0] === "vin") {
        newSteps.push("Given: R₁, R₂, and Vout are known. We solve for Vin.");
        newSteps.push("Formula: Vin = Vout × (R₁ + R₂) / R₂");
        const res = (Vout * (R1 + R2)) / R2;
        newSteps.push(`Substitute: Vin = ${Vout} × (${R1} + ${R2}) / ${R2}`);
        newSteps.push(`Result: Vin = ${res.toFixed(3)} V`);
        setVin(res.toFixed(3));
        resultValue = `Vin = ${res.toFixed(3)} V`;
      } else if (missing[0] === "vout") {
        newSteps.push("Given: Vin, R₁, and R₂ are known. We solve for Vout.");
        newSteps.push("Formula: Vout = Vin × (R₂ / (R₁ + R₂))");
        const res = Vs * (R2 / (R1 + R2));
        newSteps.push(`Substitute: Vout = ${Vs} × (${R2} / (${R1} + ${R2}))`);
        newSteps.push(`Result: Vout = ${res.toFixed(3)} V`);
        setVout(res.toFixed(3));
        resultValue = `Vout = ${res.toFixed(3)} V`;
      } else if (missing[0] === "r1") {
        newSteps.push("Given: Vin, R₂, and Vout are known. We solve for R₁.");
        newSteps.push("Formula: R₁ = R₂ × (Vin / Vout − 1)");
        const res = R2 * (Vs / Vout - 1);
        newSteps.push(`Substitute: R₁ = ${R2} × (${Vs} / ${Vout} − 1)`);
        newSteps.push(`Result: R₁ = ${formatRes(res)}`);
        setR1((res / unitMultipliers[unitR1]).toFixed(4));
        resultValue = `R₁ = ${formatRes(res)}`;
      } else if (missing[0] === "r2") {
        newSteps.push("Given: Vin, R₁, and Vout are known. We solve for R₂.");
        newSteps.push("Formula: R₂ = (R₁ × Vout) / (Vin − Vout)");
        const res = (R1 * Vout) / (Vs - Vout);
        newSteps.push(`Substitute: R₂ = (${R1} × ${Vout}) / (${Vs} − ${Vout})`);
        newSteps.push(`Result: R₂ = ${formatRes(res)}`);
        setR2((res / unitMultipliers[unitR2]).toFixed(4));
        resultValue = `R₂ = ${formatRes(res)}`;
      }
    } catch (err) {
      newSteps.push(`⚠️ Error: ${err.message}`);
    }

    setSteps(newSteps);
  };

  const resetAll = () => {
    setVin("");
    setR1("");
    setR2("");
    setVout("");
    setSteps([]);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
        <h1 className="text-3xl font-semibold text-accent dark:text-darkAccent">
          Voltage Divider Calculator
        </h1>

        {/* Formula */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Formula</h2>
          <p className="text-textDim dark:text-darkTextDim">
            Calculates output voltage or missing parameter for a two-resistor
            divider.
          </p>
          <div className="p-3 border-l-4 border-accent dark:border-darkAccent bg-surface dark:bg-darkSurface rounded">
            <code className="text-lg">Vout = (R₂ / (R₁ + R₂)) × Vin</code>
          </div>
        </section>

        {/* Calculator */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold mb-1">Calculator</h2>
          <p className="text-xs text-textDim dark:text-darkTextDim">
            Leave one field empty — the calculator will compute it and show the
            steps.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="w-28 text-textDim dark:text-darkTextDim">
                Vin (V)
              </label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="e.g. 12"
                className="w-28 px-2 py-1 border border-border dark:border-darkBorder rounded text-sm bg-surface dark:bg-darkSurface"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="w-28 text-textDim dark:text-darkTextDim">
                R₁
              </label>
              <input
                type="text"
                value={r1}
                onChange={(e) => setR1(e.target.value)}
                placeholder="e.g. 2"
                className="w-28 px-2 py-1 border border-border dark:border-darkBorder rounded text-sm bg-surface dark:bg-darkSurface"
              />
              <select
                value={unitR1}
                onChange={(e) => setUnitR1(e.target.value)}
                className="px-2 py-1 border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface text-sm"
              >
                <option value="ohm">Ω</option>
                <option value="kohm">kΩ</option>
                <option value="Mohm">MΩ</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="w-28 text-textDim dark:text-darkTextDim">
                R₂
              </label>
              <input
                type="text"
                value={r2}
                onChange={(e) => setR2(e.target.value)}
                placeholder="e.g. 1"
                className="w-28 px-2 py-1 border border-border dark:border-darkBorder rounded text-sm bg-surface dark:bg-darkSurface"
              />
              <select
                value={unitR2}
                onChange={(e) => setUnitR2(e.target.value)}
                className="px-2 py-1 border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface text-sm"
              >
                <option value="ohm">Ω</option>
                <option value="kohm">kΩ</option>
                <option value="Mohm">MΩ</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="w-28 text-textDim dark:text-darkTextDim">
                Vout (V)
              </label>
              <input
                type="text"
                value={vout}
                onChange={(e) => setVout(e.target.value)}
                placeholder="e.g. 4"
                className="w-28 px-2 py-1 border border-border dark:border-darkBorder rounded text-sm bg-surface dark:bg-darkSurface"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleCalculate}
              className="px-4 py-2 rounded-md font-medium bg-[#a9df05] dark:bg-[#a9df05] text-gray-900 dark:text-gray-900 hover:opacity-95 transition-all"
            >
              Calculate
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-md font-medium border border-border dark:border-darkBorder bg-transparent text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-all"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Console */}
        <section>
          <Console>
            {steps.length > 0 ? (
              steps.map((s, i) => (
                <div key={i} className="text-text dark:text-darkTextDim">
                  {"> "}
                  {s}
                </div>
              ))
            ) : (
              <div className="text-textDim dark:text-darkTextDim">
                Console ready...
              </div>
            )}
          </Console>
        </section>
      </div>
    </Layout>
  );
}
