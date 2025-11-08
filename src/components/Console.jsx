export default function Console({ children }) {
  return (
    <div className="p-4 mt-2 rounded-lg font-mono text-sm bg-[#111111]/5 dark:bg-[#00fffa0a] border border-border dark:border-darkBorder">
      <div className="text-text dark:text-darkTextDim">
        <p className="font-semibold text-[#111827] dark:text-[#a9df05] mb-1">
          Console Output:
        </p>
        <div className="pl-2">{children}</div>
      </div>
    </div>
  );
}
