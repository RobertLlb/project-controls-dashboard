import path from "node:path";
import { createApp } from "./app.js";
import { createPool, initDatabase, PgProjectRepository } from "./db.js";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const port = Number(process.env.PORT ?? 3000);
  const staticDir = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : undefined;

  const pool = createPool(databaseUrl);
  await initDatabase(pool);

  const app = createApp({ repository: new PgProjectRepository(pool), staticDir });
  app.listen(port, () => {
    process.stdout.write(`[api] listening on port ${port}\n`);
  });
}

main().catch((error: unknown) => {
  process.stderr.write(`[api] failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
