import Layout from "../layouts/Layout";

export default function CurveLab() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4 text-accent dark:text-darkAccent">
        CurveLab
      </h1>
      <p className="text-textDim dark:text-darkTextDim mb-4">
        Import data, select models, and visualize curve fitting with
        step-by-step explanations.
      </p>
      <div className="border border-border dark:border-darkBorder rounded-lg p-4">
        <p className="text-sm text-textDim dark:text-darkTextDim">
          Work in progress...
        </p>
      </div>
    </Layout>
  );
}
