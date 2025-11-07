import logo from "./assets/logo.png";
import sigil from "./assets/sigil.png";

function App() {
  return (
    <div className="min-h-screen bg-base text-text font-sans flex flex-col">
      <header className="flex items-center p-4 border-b border-border bg-surface">
        {/* Full InlineNode logo for large and medium screens */}
        <img
          src={logo}
          alt="InlineNode logo"
          className="hidden lg:block h-14 w-auto select-none"
          draggable="false"
        />

        {/* Sigil (the .^.) for small and medium screens */}
        <img
          src={sigil}
          alt="InlineNode sigil"
          className="block lg:hidden h-10 w-auto select-none"
          draggable="false"
        />
      </header>

      <main className="flex-1 flex items-center justify-center">
        <h2 className="text-lg text-textDim">
          InlineNode. Work In Progress..😎
        </h2>
      </main>
    </div>
  );
}

export default App;
