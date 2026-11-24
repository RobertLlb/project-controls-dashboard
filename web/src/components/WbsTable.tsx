import { formatMoney, formatPercent } from "../format";
import type { WbsNode } from "../types";

interface WbsTableProps {
  nodes: WbsNode[];
}

interface RowProps {
  node: WbsNode;
  depth: number;
}

function ProgressBar({ planned, actual }: { planned: number; actual: number }) {
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar__actual" style={{ width: `${Math.min(100, actual)}%` }} />
      <div className="bar__planned" style={{ left: `${Math.min(100, planned)}%` }} />
    </div>
  );
}

function WbsRows({ node, depth }: RowProps) {
  const isPhase = node.children.length > 0;
  const gap = node.actualPct - node.plannedPct;

  return (
    <>
      <tr className={isPhase ? "wbs__row wbs__row--phase" : "wbs__row"}>
        <th scope="row" style={{ paddingLeft: `${0.75 + depth * 1.5}rem` }}>
          <span className="wbs__code">{node.code}</span> {node.name}
        </th>
        <td className="num">{isPhase ? "" : formatMoney(node.budget)}</td>
        <td className="num">{formatPercent(node.plannedPct)}</td>
        <td className="num">{formatPercent(node.actualPct)}</td>
        <td className={`num ${gap < -5 ? "behind" : ""}`}>{`${gap >= 0 ? "+" : ""}${gap.toFixed(1)} pp`}</td>
        <td className="wbs__bar">
          <ProgressBar planned={node.plannedPct} actual={node.actualPct} />
        </td>
      </tr>
      {node.children.map((child) => (
        <WbsRows key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function WbsTable({ nodes }: WbsTableProps) {
  return (
    <div className="wbs__scroll">
      <table className="wbs">
        <caption className="sr-only">Work breakdown structure with planned and actual progress</caption>
        <thead>
          <tr>
            <th scope="col">Work package</th>
            <th scope="col" className="num">
              Budget
            </th>
            <th scope="col" className="num">
              Planned
            </th>
            <th scope="col" className="num">
              Actual
            </th>
            <th scope="col" className="num">
              Gap
            </th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <WbsRows key={node.id} node={node} depth={0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
