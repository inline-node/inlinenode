import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CurveLab from "./pages/CurveLab";
import Tools from "./pages/Tools";
import VoltageDivider from "./pages/calculators/VoltageDivider";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/curvelab" element={<CurveLab />} />
      <Route path="/tools">
        <Route index element={<Tools />} /> {/* default /tools */}
        <Route path="voltagedivider" element={<VoltageDivider />} />
      </Route>
    </Routes>
  );
}

export default App;
