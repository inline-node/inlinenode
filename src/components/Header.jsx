import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import logo from "../assets/logo.png";
import sigil from "../assets/sigil.png";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  let hoverTimer;

  // --- Hover delay handlers (for desktop dropdown) ---
  const handleEnter = () => {
    clearTimeout(hoverTimer);
    setToolsOpen(true);
  };

  const handleLeave = () => {
    hoverTimer = setTimeout(() => setToolsOpen(false), 200);
  };

  const navClasses = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "text-accent dark:text-darkAccent"
        : "text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent"
    }`;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border dark:border-darkBorder bg-surface dark:bg-darkSurface shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex gap-6 items-center">
        <NavLink to="/" className={navClasses}>
          Home
        </NavLink>
        <NavLink to="/curvelab" className={navClasses}>
          CurveLab
        </NavLink>

        {/* Tools Dropdown (Desktop) */}
        <div
          className="relative"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <button className="px-3 py-2 text-sm font-medium text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent">
            Tools ▾
          </button>

          {toolsOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-surface dark:bg-darkSurface border border-border dark:border-darkBorder rounded-lg shadow-lg z-50"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <Link
                to="/tools/voltagedivider"
                className="block px-4 py-2 text-sm text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-colors duration-200"
                onClick={() => setToolsOpen(false)}
              >
                Voltage Divider
              </Link>

              <Link
                to="/tools"
                className="block px-4 py-2 text-sm text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-colors duration-200"
                onClick={() => setToolsOpen(false)}
              >
                All Tools
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="lg:hidden p-2 text-text dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent"
        aria-label="Toggle menu"
      >
        {menuOpen ? "✖" : "☰"}
      </button>

      {/* Mobile Navigation Overlay */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-surface dark:bg-darkSurface border-t border-border dark:border-darkBorder shadow-lg flex flex-col items-start p-4 gap-3 lg:hidden">
          <NavLink
            to="/"
            className={navClasses}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </NavLink>
          <NavLink
            to="/curvelab"
            className={navClasses}
            onClick={() => setMenuOpen(false)}
          >
            CurveLab
          </NavLink>

          {/* Tools Toggle (Mobile) */}
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="px-3 py-2 text-sm font-medium text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-colors duration-200"
          >
            Tools {toolsOpen ? "▴" : "▾"}
          </button>

          {toolsOpen && (
            <div className="flex flex-col gap-2 pl-6">
              <Link
                to="/tools/voltagedivider"
                className="text-sm text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-colors duration-200"
                onClick={() => {
                  setToolsOpen(false);
                  setMenuOpen(false);
                }}
              >
                Voltage Divider
              </Link>
              <Link
                to="/tools"
                className="text-sm text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent transition-colors duration-200"
                onClick={() => {
                  setToolsOpen(false);
                  setMenuOpen(false);
                }}
              >
                All Tools
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
