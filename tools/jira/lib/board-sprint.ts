import type { BoardSprint } from "./types.ts";

/** Parse one board sprint row from cache or acli JSON. */
export function parseBoardSprintRow(entry: unknown): BoardSprint | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const row = entry as Record<string, unknown>;
  if (typeof row.id !== "number") return null;
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : undefined,
    startDate: typeof row.startDate === "string" ? row.startDate : undefined,
    endDate: typeof row.endDate === "string" ? row.endDate : undefined,
    state: typeof row.state === "string" ? row.state : undefined
  };
}

/** Parse board sprint rows from an array value. */
export function parseBoardSprintRows(value: unknown): BoardSprint[] {
  if (!Array.isArray(value)) return [];
  const sprints: BoardSprint[] = [];
  for (const entry of value) {
    const sprint = parseBoardSprintRow(entry);
    if (sprint) sprints.push(sprint);
  }
  return sprints;
}
