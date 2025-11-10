export default function ConsoleArea() {
  return (
    <section className="border border-border dark:border-darkBorder rounded-lg p-4 font-mono text-sm">
      <h2 className="text-xl font-semibold mb-2">Console Output</h2>
      <div className="bg-surface dark:bg-darkSurface border border-border dark:border-darkBorder rounded p-2 h-40 overflow-y-auto">
        <p className="text-textDim dark:text-darkTextDim">
          (Calculation steps and derivations will appear here)
        </p>
      </div>
    </section>
  );
}
