export default function ConsoleArea() {
  return (
    <section className="p-3 h-full flex flex-col font-mono text-sm">
      <h2 className="text-lg font-semibold mb-2">Console</h2>
      <div className="flex-1 border border-dashed border-border dark:border-darkBorder rounded p-2 overflow-y-auto text-textDim dark:text-darkTextDim">
        Console ready...
      </div>
    </section>
  );
}
