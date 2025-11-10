export default function ModelSelector() {
  return (
    <section className="border border-border dark:border-darkBorder rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-2">Select Model</h2>
      <select
        className="p-2 rounded bg-surface dark:bg-darkSurface border border-border dark:border-darkBorder"
        disabled
      >
        <option>Linear Regression</option>
        <option>Polynomial Regression</option>
        <option>Exponential Regression</option>
        <option>Logarithmic Regression</option>
      </select>
      <p className="text-xs text-textDim dark:text-darkTextDim mt-2">
        (Model selection will be enabled in the functional build.)
      </p>
    </section>
  );
}
