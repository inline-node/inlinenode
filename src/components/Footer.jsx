export default function Footer() {
  return (
    <footer className="text-center py-3 border-t border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-textDim dark:text-darkTextDim text-sm">
      <p>© {new Date().getFullYear()} InlineNode. All rights reserved.</p>
    </footer>
  );
}
