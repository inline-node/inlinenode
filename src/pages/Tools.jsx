import { Link } from "react-router-dom";
import Layout from "../layouts/Layout";

export default function Tools() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4 text-accent dark:text-darkAccent">
        Tools
      </h1>
      <p className="text-textDim dark:text-darkTextDim mb-6">
        Explore engineering calculators with detailed explanations and live
        console output.
      </p>

      <div className="grid gap-3">
        <Link
          to="/tools/voltagedivider"
          className="text-accent dark:text-darkAccent hover:underline"
        >
          Voltage Divider Calculator
        </Link>
      </div>
    </Layout>
  );
}
