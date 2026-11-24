export interface WbsItem {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly parentId: number | null;
  /** Budget at completion for leaf work packages. Parents carry 0. */
  readonly budget: number;
  readonly startWeek: number | null;
  readonly endWeek: number | null;
}

export interface ProgressRow {
  readonly wbsId: number;
  readonly week: number;
  /** Cumulative planned progress, 0-100. */
  readonly plannedPct: number;
  /** Cumulative actual progress, 0-100. Null for weeks after the status week. */
  readonly actualPct: number | null;
  /** Cumulative actual cost. Null for weeks after the status week. */
  readonly actualCost: number | null;
}

export interface ProjectMeta {
  readonly name: string;
  readonly totalWeeks: number;
  readonly statusWeek: number;
}

export interface ProjectData {
  readonly meta: ProjectMeta;
  readonly items: readonly WbsItem[];
  readonly progress: readonly ProgressRow[];
}

export interface Kpis {
  readonly statusWeek: number;
  readonly bac: number;
  readonly pv: number;
  readonly ev: number;
  readonly ac: number;
  readonly sv: number;
  readonly cv: number;
  readonly spi: number | null;
  readonly cpi: number | null;
  readonly eac: number | null;
  readonly vac: number | null;
}

export interface SCurvePoint {
  readonly week: number;
  readonly planned: number;
  readonly actual: number | null;
}

export interface WbsNode extends WbsItem {
  readonly plannedPct: number;
  readonly actualPct: number;
  readonly children: readonly WbsNode[];
}

export interface ProjectRepository {
  load(): Promise<ProjectData>;
}
