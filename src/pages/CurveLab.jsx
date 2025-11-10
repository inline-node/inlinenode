import Layout from "../layouts/Layout";
import DataInput from "./curvelab/DataInput";
import ModelSelector from "./curvelab/ModelSelector";
import GraphArea from "./curvelab/GraphArea";
import ConsoleArea from "./curvelab/ConsoleArea";
import OutputSummary from "./curvelab/OutputSummary";

export default function CurveLab() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-8">
        <h1 className="text-3xl font-semibold text-accent dark:text-darkAccent">
          CurveLab
        </h1>
        <p className="text-textDim dark:text-darkTextDim">
          Analyze and fit data using various regression models. Import data, select models, visualize, and
          view step-by-step derivations.
        </p>

        <DataInput />
        <ModelSelector />
        <GraphArea />
        <OutputSummary />
        <ConsoleArea />
      </div>
    </Layout>
  );
}
