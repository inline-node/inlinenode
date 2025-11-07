import logo from "./assets/InlineNode-logo.png";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* --- HEADER --- */}
      <header className="flex items-center p-4 border-b border-gray-800">
      <img
        src={logo}
        alt="InlineNode logo"
        className="h-12 w-auto select-none"
        draggable="false"
      />
    </header>

      {/* --- MAIN --- */}
      <main className="flex-1 flex items-center justify-center">
        <h2 className="text-lg text-gray-400">WORK IN PROGRESS</h2>
      </main>
    </div>
  );
}

export default App;
