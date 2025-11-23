import { useState, useEffect } from "react";
import Layout from "../layouts/Layout";
import DataInput from "./curvelab/DataInput";
import GraphArea from "./curvelab/GraphArea";
import OutputSummary from "./curvelab/OutputSummary";
import ConsoleArea from "./curvelab/ConsoleArea";

export default function CurveLab() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  return (
    <Layout>
      {isMobile ? (
        <MobileCurveLab />
      ) : isTablet ? (
        <TabletCurveLab />
      ) : (
        <DesktopCurveLab />
      )}
    </Layout>
  );
}

/* ---------------- DESKTOP ---------------- */
function DesktopCurveLab() {
  return (
    <div
      className="fixed inset-x-0 
                 top-[78px] bottom-[50px]
                 grid grid-rows-[2fr_1fr] grid-cols-[1.2fr_2fr] gap-[0.25rem]
                 bg-background text-text dark:bg-darkBackground dark:text-darkText px-[0.25rem]"
    >
      <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <DataInput />
      </div>
      <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <GraphArea />
      </div>
      <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <OutputSummary />
      </div>
      <div className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <ConsoleArea />
      </div>
    </div>
  );
}

/* ---------------- TABLET ---------------- */
function TabletCurveLab() {
  return (
    <div
      className="absolute inset-x-0 top-[60px] bottom-[56px]
                 grid grid-rows-[auto_auto_auto_auto] grid-cols-1 gap-[0.5rem]
                 bg-background text-text dark:bg-darkBackground dark:text-darkText p-[0.5rem] overflow-y-auto"
    >
      <section className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <GraphArea />
      </section>
      <section className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <DataInput />
      </section>
      <section className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <OutputSummary />
      </section>
      <section className="border border-border dark:border-darkBorder rounded bg-surface dark:bg-darkSurface overflow-hidden">
        <ConsoleArea />
      </section>
    </div>
  );
}

/* ---------------- MOBILE ---------------- */
function MobileCurveLab() {
  const [activeTab, setActiveTab] = useState("data");

  const tabs = [
    { key: "data", label: "Data", component: <DataInput /> },
    { key: "graph", label: "Graph", component: <GraphArea /> },
    { key: "results", label: "Results", component: <OutputSummary /> },
    { key: "console", label: "Console", component: <ConsoleArea /> },
  ];

  const current = tabs.find((t) => t.key === activeTab);

  return (
    <div className="absolute inset-x-0 top-[60px] bottom-[56px] flex flex-col bg-background dark:bg-darkBackground overflow-y-auto">
      {/* MOBILE TAB BAR — smaller height */}
      <div className="flex justify-around border-b border-border dark:border-darkBorder bg-surface dark:bg-darkSurface sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "text-accent dark:text-darkAccent border-b-2 border-accent dark:border-darkAccent"
                : "text-textDim dark:text-darkTextDim hover:text-accent dark:hover:text-darkAccent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ACTIVE TAB CONTENT — removed flex-1 to avoid giant blank space */}
      <div className="p-2 overflow-x-auto">{current?.component}</div>
    </div>
  );
}
