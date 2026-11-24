import type { ProjectResponse } from "./types";

export async function fetchProject(signal?: AbortSignal): Promise<ProjectResponse> {
  const response = await fetch("/api/project", { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as ProjectResponse;
}
