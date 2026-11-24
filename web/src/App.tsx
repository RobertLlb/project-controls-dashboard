import { useEffect, useState } from "react";
import { fetchProject } from "./api";
import { KpiCards } from "./components/KpiCards";
import { SCurveChart } from "./components/SCurveChart";
import { WbsTable } from "./components/WbsTable";
import type { ProjectResponse } from "./types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ProjectResponse };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchProject(controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="sheet">
      <header className="masthead">
        <p className="masthead__eyebrow">Project controls · Earned value report</p>
        <h1 className="masthead__title">{state.status === "ready" ? state.data.meta.name : "Project controls"}</h1>
        {state.status === "ready" && (
          <p className="masthead__meta">
            Status at week {state.data.meta.statusWeek} of {state.data.meta.totalWeeks} · synthetic demo data
          </p>
        )}
      </header>

      <main>
        {state.status === "loading" && <p role="status">Loading project data…</p>}
        {state.status === "error" && (
          <p role="alert" className="error">
            Could not load the project: {state.message}. Is the API running?
          </p>
        )}
        {state.status === "ready" && (
          <>
            <KpiCards kpis={state.data.kpis} />
            <section className="panel" aria-labelledby="scurve-title">
              <h2 id="scurve-title" className="panel__title">
                S-curve · cumulative progress
              </h2>
              <SCurveChart data={state.data.sCurve} statusWeek={state.data.meta.statusWeek} />
            </section>
            <section className="panel" aria-labelledby="wbs-title">
              <h2 id="wbs-title" className="panel__title">
                Work breakdown structure
              </h2>
              <WbsTable nodes={state.data.wbs} />
            </section>
          </>
        )}
      </main>

      <footer className="colophon">
        Built by Robert Barbosa · React, TypeScript, Node.js, PostgreSQL · All figures are fictional.
      </footer>
    </div>
  );
}
