import Layout from "../layouts/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center text-center mt-10">
        <h1 className="text-3xl font-bold mb-4 text-accent dark:text-darkAccent">
          InlineNode. Work In Progress..😎
        </h1>
        <p className="max-w-xl text-textDim dark:text-darkTextDim">
          The ultimate engineering suite — CurveLab for analysis and Tools for
          practical calculations. Learn, explore, and compute efficiently.
        </p>
      </div>
    </Layout>
  );
}
