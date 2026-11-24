import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { buildSCurve, buildWbsTree, computeKpis } from "./evm.js";
import type { ProjectRepository } from "./types.js";

interface AppOptions {
  readonly repository: ProjectRepository;
  /** Directory with the built web app. When set and present, it is served at `/`. */
  readonly staticDir?: string;
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export function createApp({ repository, staticDir }: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get(
    "/api/project",
    asyncRoute(async (_req, res) => {
      const { meta, items, progress } = await repository.load();
      res.json({
        meta,
        kpis: computeKpis(items, progress, meta.statusWeek),
        sCurve: buildSCurve(items, progress, meta.totalWeeks, meta.statusWeek),
        wbs: buildWbsTree(items, progress, meta.statusWeek),
      });
    }),
  );

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.resolve(staticDir, "index.html"));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`[api] request failed: ${message}\n`);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
