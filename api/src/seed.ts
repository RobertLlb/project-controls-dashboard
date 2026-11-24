import type { ProgressRow, ProjectData, WbsItem } from "./types.js";

/**
 * Synthetic data only. The project below is invented for demonstration:
 * a generic heat exchanger retrofit with made-up budgets and schedule.
 */

const TOTAL_WEEKS = 26;
const STATUS_WEEK = 16;

interface PhaseSpec {
  readonly code: string;
  readonly name: string;
  readonly packages: readonly PackageSpec[];
}

interface PackageSpec {
  readonly name: string;
  readonly budget: number;
  readonly startWeek: number;
  readonly endWeek: number;
}

const PHASES: readonly PhaseSpec[] = [
  {
    code: "1",
    name: "Engineering",
    packages: [
      { name: "Basic design", budget: 40_000, startWeek: 1, endWeek: 4 },
      { name: "Detailed design", budget: 80_000, startWeek: 3, endWeek: 8 },
      { name: "Design review and approvals", budget: 20_000, startWeek: 7, endWeek: 9 },
    ],
  },
  {
    code: "2",
    name: "Procurement",
    packages: [
      { name: "Long-lead materials", budget: 150_000, startWeek: 5, endWeek: 12 },
      { name: "Standard components", budget: 60_000, startWeek: 8, endWeek: 13 },
      { name: "Inspection and logistics", budget: 25_000, startWeek: 11, endWeek: 14 },
    ],
  },
  {
    code: "3",
    name: "Fabrication",
    packages: [
      { name: "Pressure parts", budget: 180_000, startWeek: 10, endWeek: 18 },
      { name: "Structural steel", budget: 90_000, startWeek: 12, endWeek: 19 },
      { name: "Factory acceptance test", budget: 30_000, startWeek: 18, endWeek: 20 },
    ],
  },
  {
    code: "4",
    name: "Site and commissioning",
    packages: [
      { name: "Demolition and preparation", budget: 50_000, startWeek: 16, endWeek: 19 },
      { name: "Installation", budget: 140_000, startWeek: 19, endWeek: 24 },
      { name: "Commissioning and handover", budget: 35_000, startWeek: 24, endWeek: 26 },
    ],
  },
];

/** Small deterministic PRNG so the demo data is identical on every run. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Smoothstep ramp between the week before start and the end week, in percent. */
export function plannedPctAt(startWeek: number, endWeek: number, week: number): number {
  const rampStart = startWeek - 1;
  const t = Math.min(1, Math.max(0, (week - rampStart) / (endWeek - rampStart)));
  return t * t * (3 - 2 * t) * 100;
}

export function generateProject(): ProjectData {
  const random = mulberry32(2026);
  const items: WbsItem[] = [];
  const progress: ProgressRow[] = [];
  let nextId = 1;

  for (const phase of PHASES) {
    const phaseId = nextId++;
    items.push({
      id: phaseId,
      code: phase.code,
      name: phase.name,
      parentId: null,
      budget: 0,
      startWeek: null,
      endWeek: null,
    });

    phase.packages.forEach((pkg, packageIndex) => {
      const id = nextId++;
      items.push({
        id,
        code: `${phase.code}.${packageIndex + 1}`,
        name: pkg.name,
        parentId: phaseId,
        budget: pkg.budget,
        startWeek: pkg.startWeek,
        endWeek: pkg.endWeek,
      });

      const lagWeeks = random() * 1.6;
      const costFactor = 0.95 + random() * 0.2;
      let previousActual = 0;

      for (let week = 1; week <= TOTAL_WEEKS; week++) {
        const planned = plannedPctAt(pkg.startWeek, pkg.endWeek, week);
        const isActualWeek = week <= STATUS_WEEK;
        const rawActual = plannedPctAt(pkg.startWeek, pkg.endWeek, week - lagWeeks);
        const actual = isActualWeek ? Math.max(previousActual, round(rawActual, 1)) : null;
        if (actual !== null) previousActual = actual;

        progress.push({
          wbsId: id,
          week,
          plannedPct: round(planned, 1),
          actualPct: actual,
          actualCost: actual === null ? null : round((pkg.budget * actual * costFactor) / 100, 2),
        });
      }
    });
  }

  return {
    meta: { name: "Heat Exchanger Retrofit (demo)", totalWeeks: TOTAL_WEEKS, statusWeek: STATUS_WEEK },
    items,
    progress,
  };
}
