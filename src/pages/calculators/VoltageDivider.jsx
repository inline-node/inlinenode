import Layout from "../../layouts/Layout";
import Console from "../../components/Console";
import { useState } from "react";

export default function VoltageDivider() {
  const [vin, setVin] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");
  const [vout, setVout] = useState(null);

  const handleCalculate = () => {
    const vinVal = parseFloat(vin);
    const r1Val = parseFloat(r1);
    const r2Val = parseFloat(r2);

    if (isNaN(vinVal) || isNaN(r1Val) || isNaN(r2Val)) {
      setVout("⚠️ Please enter valid numbers.");
      return;
    }

    const result = (r2Val / (r1Val + r2Val)) * vinVal;
    setVout(result.toFixed(3));
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl font-semibold text-accent dark:text-darkAccent">
          Voltage Divider Calculator
        </h1>

        {/* Formula Section */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Formula</h2>
          <p className="text-textDim dark:text-darkTextDim">
            The voltage divider calculates the output voltage across one
            resistor when two resistors are connected in series across a voltage
            supply.
          </p>
          <div className="mt-3 p-3 border-l-4 border-accent dark:border-darkAccent bg-surface dark:bg-darkSurface rounded">
            <code className="text-lg">Vout = (R2 / (R1 + R2)) × Vin</code>
          </div>
        </section>

        {/* Example Section */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Example</h2>
          <p className="text-textDim dark:text-darkTextDim">
            For Vin = 12V, R1 = 2kΩ, R2 = 1kΩ:
          </p>
          <p className="text-textDim dark:text-darkTextDim">
            Vout = (1 / (2 + 1)) × 12 = 4V
          </p>
        </section>

        {/* Calculator */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold mb-2">Calculator</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              type="number"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Vin (V)"
              className="p-2 rounded border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
            />
            <input
              type="number"
              value={r1}
              onChange={(e) => setR1(e.target.value)}
              placeholder="R1 (Ω)"
              className="p-2 rounded border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
            />
            <input
              type="number"
              value={r2}
              onChange={(e) => setR2(e.target.value)}
              placeholder="R2 (Ω)"
              className="p-2 rounded border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkText"
            />
          </div>
          <button
            onClick={handleCalculate}
            className="self-start px-4 py-2 rounded-md font-medium
                      bg-accent dark:bg-darkAccent 
                      text-gray-900 dark:text-gray-900
                      hover:bg-[#a1c905] dark:hover:bg-[#a1c905] 
                      shadow-sm transition-all duration-300"
          >
            Calculate
          </button>
        </section>

        {/* Console Output */}
        <section>
          <Console>
            {vout !== null && (
              <div>
                <p className="font-semibold text-[#111827] dark:text-[#a9df05]">
                  {typeof vout === "string" ? vout : `Vout = ${vout} V`}
                </p>
                {typeof vout !== "string" && (
                  <p className="text-textDim dark:text-darkTextDim mt-1">
                    Step: Vout = (R2 / (R1 + R2)) × Vin = ({r2} / ({r1} + {r2}))
                    × {vin}
                  </p>
                )}
              </div>
            )}
          </Console>
        </section>
      </div>
    </Layout>
  );
}
