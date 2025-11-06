import logo from "./assets/InlineNode-logo.png";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* --- HEADER --- */}
      <header className="flex items-center gap-3 p-4 border-b border-gray-800">
        <img
          src={logo}
          alt="InlineNode logo"
          className="h-10 w-auto select-none"
          draggable="false"
        />
        <h1 className="text-2xl font-semibold tracking-wide">InlineNode</h1>
      </header>

      {/* --- MAIN --- */}
      <main className="flex-1 flex items-center justify-center">
        <h2 className="text-lg text-gray-400">Welcome to InlineNode</h2>
      </main>
    </div>
  );
}

export default App;
