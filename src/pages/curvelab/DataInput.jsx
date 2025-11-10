export default function DataInput() {
  return (
    <section className="p-3 h-full flex flex-col">
      {/* Title */}
      <h2 className="text-lg font-semibold mb-2">Data Table</h2>

      {/* Placeholder table */}
      <div className="flex-1 border border-dashed border-border dark:border-darkBorder rounded mb-3 flex items-center justify-center text-textDim dark:text-darkTextDim text-sm">
        (Spreadsheet placeholder)
      </div>

      {/* Bottom controls area */}
      <div className="flex items-center justify-between">
        {/* Model selector */}
        <div className="flex flex-col">
          <label
            htmlFor="modelSelect"
            className="text-xs text-textDim dark:text-darkTextDim mb-1"
          >
            Select Model
          </label>
          <select
            id="modelSelect"
            className="px-2 py-1 rounded border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-sm"
          >
            <option>Linear Regression</option>
            <option>Polynomial Regression</option>
            <option>Exponential Regression</option>
            <option>Logarithmic Regression</option>
            <option>Power Law</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            disabled
            className="px-3 py-1 rounded-md font-medium bg-accent/80 dark:bg-darkAccent/80 text-gray-900 dark:text-gray-100 cursor-not-allowed"
          >
            Fit Curve
          </button>
          <button
            disabled
            className="px-3 py-1 rounded-md font-medium border border-border dark:border-darkBorder text-textDim dark:text-darkTextDim cursor-not-allowed"
          >
            Clear Table
          </button>
        </div>
      </div>
    </section>
  );
}
