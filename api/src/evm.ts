import type { Kpis, ProgressRow, SCurvePoint, WbsItem, WbsNode } from "./types.js";

type ProgressIndex = ReadonlyMap<string, ProgressRow>;

const keyOf = (wbsId: number, week: number): string => `${wbsId}:${week}`;

function indexProgress(progress: readonly ProgressRow[]): ProgressIndex {
  return new Map(progress.map((row) => [keyOf(row.wbsId, row.week), row]));
}

/** Items that have no children. Only these carry budget and progress. */
function leavesOf(items: readonly WbsItem[]): readonly WbsItem[] {
  const parentIds = new Set(items.map((item) => item.parentId).filter((id) => id !== null));
  return items.filter((item) => !parentIds.has(item.id));
}

const plannedAt = (index: ProgressIndex, id: number, week: number): number =>
  index.get(keyOf(id, week))?.plannedPct ?? 0;

const actualAt = (index: ProgressIndex, id: number, week: number): number =>
  index.get(keyOf(id, week))?.actualPct ?? 0;

const costAt = (index: ProgressIndex, id: number, week: number): number =>
  index.get(keyOf(id, week))?.actualCost ?? 0;

const ratio = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : numerator / denominator;

export function computeKpis(
  items: readonly WbsItem[],
  progress: readonly ProgressRow[],
  statusWeek: number,
): Kpis {
  const index = indexProgress(progress);
  const leaves = leavesOf(items);

  const bac = leaves.reduce((sum, leaf) => sum + leaf.budget, 0);
  const pv = leaves.reduce((sum, leaf) => sum + (leaf.budget * plannedAt(index, leaf.id, statusWeek)) / 100, 0);
  const ev = leaves.reduce((sum, leaf) => sum + (leaf.budget * actualAt(index, leaf.id, statusWeek)) / 100, 0);
  const ac = leaves.reduce((sum, leaf) => sum + costAt(index, leaf.id, statusWeek), 0);

  const cpi = ratio(ev, ac);
  const eac = cpi === null || cpi === 0 ? null : bac / cpi;

  return {
    statusWeek,
    bac,
    pv,
    ev,
    ac,
    sv: ev - pv,
    cv: ev - ac,
    spi: ratio(ev, pv),
    cpi,
    eac,
    vac: eac === null ? null : bac - eac,
  };
}

export function buildSCurve(
  items: readonly WbsItem[],
  progress: readonly ProgressRow[],
  totalWeeks: number,
  statusWeek: number,
): readonly SCurvePoint[] {
  const index = indexProgress(progress);
  const leaves = leavesOf(items);
  const bac = leaves.reduce((sum, leaf) => sum + leaf.budget, 0);

  const weightedPct = (week: number, pick: (id: number, week: number) => number): number =>
    bac === 0 ? 0 : leaves.reduce((sum, leaf) => sum + leaf.budget * pick(leaf.id, week), 0) / bac;

  return Array.from({ length: totalWeeks + 1 }, (_, week) => ({
    week,
    planned: weightedPct(week, (id, w) => plannedAt(index, id, w)),
    actual: week > statusWeek ? null : weightedPct(week, (id, w) => actualAt(index, id, w)),
  }));
}

interface Rollup {
  readonly budget: number;
  readonly plannedValue: number;
  readonly actualValue: number;
}

export function buildWbsTree(
  items: readonly WbsItem[],
  progress: readonly ProgressRow[],
  statusWeek: number,
): readonly WbsNode[] {
  const index = indexProgress(progress);
  const childrenOf = (parentId: number | null): readonly WbsItem[] =>
    items.filter((item) => item.parentId === parentId);

  const build = (item: WbsItem): { node: WbsNode; rollup: Rollup } => {
    const kids = childrenOf(item.id).map(build);

    const rollup: Rollup =
      kids.length === 0
        ? {
            budget: item.budget,
            plannedValue: item.budget * plannedAt(index, item.id, statusWeek),
            actualValue: item.budget * actualAt(index, item.id, statusWeek),
          }
        : kids.reduce<Rollup>(
            (acc, kid) => ({
              budget: acc.budget + kid.rollup.budget,
              plannedValue: acc.plannedValue + kid.rollup.plannedValue,
              actualValue: acc.actualValue + kid.rollup.actualValue,
            }),
            { budget: 0, plannedValue: 0, actualValue: 0 },
          );

    const node: WbsNode = {
      ...item,
      plannedPct: rollup.budget === 0 ? 0 : rollup.plannedValue / rollup.budget,
      actualPct: rollup.budget === 0 ? 0 : rollup.actualValue / rollup.budget,
      children: kids.map((kid) => kid.node),
    };

    return { node, rollup };
  };

  return childrenOf(null).map((root) => build(root).node);
}
