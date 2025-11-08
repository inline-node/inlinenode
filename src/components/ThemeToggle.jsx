import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  useEffect(() => {
    const html = document.querySelector("html");
    if (darkMode) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed bottom-4 left-4 p-2 rounded-full border border-border dark:border-darkBorder bg-surface dark:bg-darkSurface text-text dark:text-darkTextDim hover:text-accent transition-all duration-300 shadow-sm"
      aria-label="Toggle theme"
    >
      {darkMode ? "☀️" : "🌙"}
    </button>
  );
}
