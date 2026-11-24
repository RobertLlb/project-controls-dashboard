import { describe, expect, it } from "vitest";
import { computeKpis } from "./evm.js";
import { generateProject, plannedPctAt } from "./seed.js";

describe("plannedPctAt", () => {
  it("is 0 before the task and 100 after it ends", () => {
    expect(plannedPctAt(5, 10, 0)).toBe(0);
    expect(plannedPctAt(5, 10, 10)).toBe(100);
    expect(plannedPctAt(5, 10, 20)).toBe(100);
  });

  it("never decreases from one week to the next", () => {
    const values = Array.from({ length: 30 }, (_, week) => plannedPctAt(3, 12, week));

    values.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(values[i] ?? 0));
  });
});

describe("generateProject", () => {
  it("is deterministic", () => {
    expect(generateProject()).toEqual(generateProject());
  });

  it("only has actuals up to the status week", () => {
    const { meta, progress } = generateProject();

    progress.forEach((row) => {
      if (row.week > meta.statusWeek) {
        expect(row.actualPct).toBeNull();
        expect(row.actualCost).toBeNull();
      } else {
        expect(row.actualPct).not.toBeNull();
      }
    });
  });

  it("keeps actual progress cumulative per work package", () => {
    const { items, progress } = generateProject();

    items.forEach((item) => {
      const actuals = progress
        .filter((row) => row.wbsId === item.id && row.actualPct !== null)
        .map((row) => row.actualPct ?? 0);

      actuals.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(actuals[i] ?? 0));
    });
  });

  it("produces plausible KPIs for a project running slightly behind", () => {
    const { items, progress, meta } = generateProject();
    const kpis = computeKpis(items, progress, meta.statusWeek);

    expect(kpis.bac).toBe(900_000);
    expect(kpis.spi).not.toBeNull();
    expect(kpis.spi ?? 0).toBeGreaterThan(0.7);
    expect(kpis.spi ?? 2).toBeLessThan(1.05);
  });
});
