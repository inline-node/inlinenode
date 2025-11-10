export default function DataInput() {
  return (
    <section className="p-3 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Data Table</h2>
      <p className="text-textDim dark:text-darkTextDim text-sm">
        (Editable table will be placed here.)
      </p>
      <div className="flex-1 border border-dashed border-border dark:border-darkBorder rounded mt-2 flex items-center justify-center text-textDim dark:text-darkTextDim text-sm">
        Spreadsheet Placeholder
      </div>
    </section>
  );
}
