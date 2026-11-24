export interface Kpis {
  statusWeek: number;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number | null;
  cpi: number | null;
  eac: number | null;
  vac: number | null;
}

export interface SCurvePoint {
  week: number;
  planned: number;
  actual: number | null;
}

export interface WbsNode {
  id: number;
  code: string;
  name: string;
  budget: number;
  startWeek: number | null;
  endWeek: number | null;
  plannedPct: number;
  actualPct: number;
  children: WbsNode[];
}

export interface ProjectResponse {
  meta: { name: string; totalWeeks: number; statusWeek: number };
  kpis: Kpis;
  sCurve: SCurvePoint[];
  wbs: WbsNode[];
}
