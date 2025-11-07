import logo from "./assets/InlineNode-logo.png";

function App() {
  return (
  <div className="min-h-screen bg-base text-text font-sans flex flex-col">
    <header className="flex items-center p-4 border-b border-border bg-surface">
      <img
        src={logo}
        alt="InlineNode logo"
        className="h-14 w-auto select-none"
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
