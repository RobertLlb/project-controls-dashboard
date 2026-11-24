import { describe, expect, it } from "vitest";
import { buildSCurve, buildWbsTree, computeKpis } from "./evm.js";
import type { ProgressRow, WbsItem } from "./types.js";

const items: WbsItem[] = [
  { id: 1, code: "1", name: "Phase", parentId: null, budget: 0, startWeek: null, endWeek: null },
  { id: 2, code: "1.1", name: "A", parentId: 1, budget: 100, startWeek: 1, endWeek: 2 },
  { id: 3, code: "1.2", name: "B", parentId: 1, budget: 300, startWeek: 1, endWeek: 2 },
];

const progress: ProgressRow[] = [
  { wbsId: 2, week: 1, plannedPct: 50, actualPct: 40, actualCost: 50 },
  { wbsId: 2, week: 2, plannedPct: 100, actualPct: null, actualCost: null },
  { wbsId: 3, week: 1, plannedPct: 50, actualPct: 50, actualCost: 150 },
  { wbsId: 3, week: 2, plannedPct: 100, actualPct: null, actualCost: null },
];

describe("computeKpis", () => {
  it("computes earned value metrics at the status week", () => {
    const kpis = computeKpis(items, progress, 1);

    expect(kpis.bac).toBe(400);
    expect(kpis.pv).toBe(200);
    expect(kpis.ev).toBe(190);
    expect(kpis.ac).toBe(200);
    expect(kpis.sv).toBe(-10);
    expect(kpis.cv).toBe(-10);
    expect(kpis.spi).toBeCloseTo(0.95, 5);
    expect(kpis.cpi).toBeCloseTo(0.95, 5);
    expect(kpis.eac).toBeCloseTo(400 / 0.95, 5);
    expect(kpis.vac).toBeCloseTo(400 - 400 / 0.95, 5);
  });

  it("returns null ratios instead of dividing by zero", () => {
    const kpis = computeKpis(items, [], 1);

    expect(kpis.pv).toBe(0);
    expect(kpis.spi).toBeNull();
    expect(kpis.cpi).toBeNull();
    expect(kpis.eac).toBeNull();
  });

  it("ignores the budget of parent summary items", () => {
    const withParentBudget = items.map((i) => (i.id === 1 ? { ...i, budget: 999 } : i));

    expect(computeKpis(withParentBudget, progress, 1).bac).toBe(400);
  });
});

describe("buildSCurve", () => {
  it("weights progress by budget and stops actuals after the status week", () => {
    const curve = buildSCurve(items, progress, 2, 1);

    expect(curve).toEqual([
      { week: 0, planned: 0, actual: 0 },
      { week: 1, planned: 50, actual: 47.5 },
      { week: 2, planned: 100, actual: null },
    ]);
  });
});

describe("buildWbsTree", () => {
  it("nests children and rolls progress up weighted by budget", () => {
    const [phase] = buildWbsTree(items, progress, 1);

    expect(phase?.children).toHaveLength(2);
    expect(phase?.plannedPct).toBe(50);
    expect(phase?.actualPct).toBeCloseTo(47.5, 5);
  });
});
