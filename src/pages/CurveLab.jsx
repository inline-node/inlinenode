import Layout from "../layouts/Layout";
import DataInput from "./curvelab/DataInput";
import GraphArea from "./curvelab/GraphArea";
import OutputSummary from "./curvelab/OutputSummary";
import ConsoleArea from "./curvelab/ConsoleArea";

export default function CurveLab() {
  return (
    <Layout>
      {/* Full height grid */}
      <div className="h-[calc(100vh-80px)] w-full grid grid-rows-[2fr_1fr] grid-cols-[1.2fr_2fr] gap-3 p-3">
        {/* Top Row */}
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-auto">
          <DataInput />
        </div>
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface">
          <GraphArea />
        </div>

        {/* Bottom Row */}
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-auto">
          <OutputSummary />
        </div>
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-auto">
          <ConsoleArea />
        </div>
      </div>
    </Layout>
  );
}
