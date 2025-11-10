export default function OutputSummary() {
  return (
    <section className="border border-border dark:border-darkBorder rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-2">Results Summary</h2>
      <ul className="list-disc list-inside text-textDim dark:text-darkTextDim">
        <li>Equation: y = mx + b</li>
        <li>R² value: —</li>
        <li>Coefficients: —</li>
      </ul>
    </section>
  );
}
