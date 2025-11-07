import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import sigil from "./assets/sigil.png";

function App() {
  // Read saved theme or default to light
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark"; // returns true if 'dark', false otherwise
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
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-500
      bg-base text-text dark:bg-darkBase dark:text-darkText`}
    >
      {/* HEADER */}
      <header className="flex items-center p-4 border-b border-border bg-surface dark:bg-darkSurface dark:border-darkBorder shadow-sm">
        <img
          src={logo}
          alt="InlineNode logo"
          className="hidden lg:block h-14 w-auto select-none"
          draggable="false"
        />
        <img
          src={sigil}
          alt="InlineNode sigil"
          className="block lg:hidden h-10 w-auto select-none"
          draggable="false"
        />
      </header>

      {/* MAIN */}
      <main className="flex-1 flex items-center justify-center text-textDim dark:text-darkTextDim">
        <h2 className="text-lg">InlineNode. Work In Progress..😎</h2>
      </main>

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed bottom-4 left-4 p-2 rounded-full border border-border dark:border-darkBorder
                   bg-surface dark:bg-darkSurface text-text dark:text-darkTextDim hover:text-accent 
                   transition-all duration-300 shadow-sm"
        aria-label="Toggle theme"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

export default App;
