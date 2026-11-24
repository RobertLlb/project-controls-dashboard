import pg from "pg";
import { generateProject } from "./seed.js";
import type { ProgressRow, ProjectData, ProjectRepository, WbsItem } from "./types.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS project_meta (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  name        TEXT    NOT NULL,
  total_weeks INTEGER NOT NULL,
  status_week INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wbs_items (
  id         INTEGER PRIMARY KEY,
  code       TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  parent_id  INTEGER REFERENCES wbs_items (id),
  budget     NUMERIC NOT NULL DEFAULT 0,
  start_week INTEGER,
  end_week   INTEGER
);

CREATE TABLE IF NOT EXISTS weekly_progress (
  wbs_id      INTEGER NOT NULL REFERENCES wbs_items (id),
  week        INTEGER NOT NULL,
  planned_pct NUMERIC NOT NULL,
  actual_pct  NUMERIC,
  actual_cost NUMERIC,
  PRIMARY KEY (wbs_id, week)
);
`;

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

/** Creates the tables and loads the synthetic demo project when the database is empty. */
export async function initDatabase(pool: pg.Pool): Promise<void> {
  await pool.query(SCHEMA);

  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM project_meta");
  if (Number(rows[0]?.count ?? 0) > 0) return;

  const data = generateProject();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO project_meta (id, name, total_weeks, status_week) VALUES (1, $1, $2, $3)",
      [data.meta.name, data.meta.totalWeeks, data.meta.statusWeek],
    );
    // Parents come before their children in the generated list, so inserting in order is safe.
    for (const item of data.items) {
      await client.query(
        "INSERT INTO wbs_items (id, code, name, parent_id, budget, start_week, end_week) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [item.id, item.code, item.name, item.parentId, item.budget, item.startWeek, item.endWeek],
      );
    }
    await client.query(
      `INSERT INTO weekly_progress (wbs_id, week, planned_pct, actual_pct, actual_cost)
       SELECT * FROM UNNEST($1::int[], $2::int[], $3::numeric[], $4::numeric[], $5::numeric[])`,
      [
        data.progress.map((row) => row.wbsId),
        data.progress.map((row) => row.week),
        data.progress.map((row) => row.plannedPct),
        data.progress.map((row) => row.actualPct),
        data.progress.map((row) => row.actualCost),
      ],
    );
    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

interface ItemRecord {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  budget: string;
  start_week: number | null;
  end_week: number | null;
}

interface ProgressRecord {
  wbs_id: number;
  week: number;
  planned_pct: string;
  actual_pct: string | null;
  actual_cost: string | null;
}

const toNumberOrNull = (value: string | null): number | null => (value === null ? null : Number(value));

export class PgProjectRepository implements ProjectRepository {
  constructor(private readonly pool: pg.Pool) {}

  async load(): Promise<ProjectData> {
    const [metaResult, itemResult, progressResult] = await Promise.all([
      this.pool.query<{ name: string; total_weeks: number; status_week: number }>(
        "SELECT name, total_weeks, status_week FROM project_meta WHERE id = 1",
      ),
      this.pool.query<ItemRecord>("SELECT * FROM wbs_items ORDER BY id"),
      this.pool.query<ProgressRecord>("SELECT * FROM weekly_progress ORDER BY wbs_id, week"),
    ]);

    const meta = metaResult.rows[0];
    if (!meta) throw new Error("project_meta is empty: database was not initialised");

    const items: WbsItem[] = itemResult.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      parentId: row.parent_id,
      budget: Number(row.budget),
      startWeek: row.start_week,
      endWeek: row.end_week,
    }));

    const progress: ProgressRow[] = progressResult.rows.map((row) => ({
      wbsId: row.wbs_id,
      week: row.week,
      plannedPct: Number(row.planned_pct),
      actualPct: toNumberOrNull(row.actual_pct),
      actualCost: toNumberOrNull(row.actual_cost),
    }));

    return {
      meta: { name: meta.name, totalWeeks: meta.total_weeks, statusWeek: meta.status_week },
      items,
      progress,
    };
  }
}
