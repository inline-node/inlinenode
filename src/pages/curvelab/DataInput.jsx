export default function DataInput() {
  return (
    <section className="border border-border dark:border-darkBorder rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-2">Data Input</h2>
      <p className="text-textDim dark:text-darkTextDim">
        Paste or upload your dataset here (CSV/XLS support coming soon).
      </p>
      <textarea
        className="w-full h-32 mt-2 p-2 rounded bg-surface dark:bg-darkSurface border border-border dark:border-darkBorder text-sm"
        placeholder="x,y&#10;1,2&#10;2,4&#10;3,6"
        readOnly
      />
    </section>
  );
}
