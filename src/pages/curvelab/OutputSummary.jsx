export default function OutputSummary() {
  return (
    <section className="p-3 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Results</h2>
      <ul className="text-textDim dark:text-darkTextDim text-sm space-y-1">
        <li>Equation: —</li>
        <li>R² Value: —</li>
        <li>Standard Error: —</li>
        <li>Run Time: —</li>
      </ul>
    </section>
  );
}
