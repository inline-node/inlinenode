import Layout from "../layouts/Layout";
import DataInput from "./curvelab/DataInput";
import GraphArea from "./curvelab/GraphArea";
import OutputSummary from "./curvelab/OutputSummary";
import ConsoleArea from "./curvelab/ConsoleArea";

export default function CurveLab() {
  return (
    <Layout>
      {/* Main fixed grid adjusted for header + footer */}
      <div
        className="fixed inset-x-0 top-[72px] bottom-[48px] 
                   grid grid-rows-[2fr_1fr] grid-cols-[1.2fr_2fr] gap-[0.5rem] 
                   bg-background text-text dark:bg-darkBackground dark:text-darkText p-[0.5rem]"
      >
        {/* Top row */}
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
          <DataInput />
        </div>

        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
          <GraphArea />
        </div>

        {/* Bottom row */}
        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
          <OutputSummary />
        </div>

        <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
          <ConsoleArea />
        </div>
      </div>
    </Layout>
  );
}
