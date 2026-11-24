import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { generateProject } from "./seed.js";
import type { ProjectRepository } from "./types.js";

let server: Server | undefined;

async function start(repository: ProjectRepository): Promise<string> {
  const app = createApp({ repository });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server?.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

const healthyRepository: ProjectRepository = { load: async () => generateProject() };

describe("API", () => {
  it("reports health", async () => {
    const base = await start(healthyRepository);

    const response = await fetch(`${base}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns KPIs, S-curve and WBS for the project", async () => {
    const base = await start(healthyRepository);

    const response = await fetch(`${base}/api/project`);
    const body = (await response.json()) as {
      kpis: { bac: number };
      sCurve: unknown[];
      wbs: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body.kpis.bac).toBe(900_000);
    expect(body.sCurve).toHaveLength(27);
    expect(body.wbs).toHaveLength(4);
  });

  it("hides internal details when the repository fails", async () => {
    const base = await start({
      load: async () => {
        throw new Error("password authentication failed for user secret");
      },
    });

    const response = await fetch(`${base}/api/project`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });

  it("answers unknown routes with 404 JSON", async () => {
    const base = await start(healthyRepository);

    const response = await fetch(`${base}/api/nope`);

    expect(response.status).toBe(404);
  });
});
