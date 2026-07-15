import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import type { BoardSprint, Folder } from "./types.ts";

/** Skill folder: `~/.agents/skills/jira-board/`. */
export function jiraBoardSkillDir(baseDir = homedir()): string {
  return path.resolve(baseDir, ".agents", "skills", "jira-board");
}

export const JIRA_BOARD_SKILL_DIR = jiraBoardSkillDir();

/** Cached board context written by `jira board sync`. */
export function boardInfoCachePath(baseDir = homedir()): string {
  return path.join(jiraBoardSkillDir(baseDir), "info.json");
}

export const BOARD_INFO_CACHE_PATH = boardInfoCachePath();

export type BoardInfoCache = {
  syncedAt: string;
  boardId: string | null;
  site: string;
  project: string;
  effectiveJql: string;
  retainedSprints: BoardSprint[];
  counts: Record<Folder, number>;
  issueCount: number;
};

/** Persist board context for `jira info`. */
export function writeBoardInfoCache(
  cache: BoardInfoCache,
  baseDir = homedir()
): void {
  const skillDir = jiraBoardSkillDir(baseDir);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    boardInfoCachePath(baseDir),
    `${JSON.stringify(cache, null, 2)}\n`,
    "utf-8"
  );
}

/** Read cached board context when present. */
export function readBoardInfoCache(baseDir = homedir()): BoardInfoCache | null {
  const filePath = boardInfoCachePath(baseDir);
  if (!fs.existsSync(filePath)) return null;

  try {
    const parsed = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    ) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const raw = parsed as Record<string, unknown>;
    if (typeof raw.syncedAt !== "string" || typeof raw.effectiveJql !== "string") {
      return null;
    }

    const counts = parseCounts(raw.counts);
    const retainedSprints = parseRetainedSprints(raw.retainedSprints);

    return {
      syncedAt: raw.syncedAt,
      boardId: typeof raw.boardId === "string" ? raw.boardId : null,
      site: typeof raw.site === "string" ? raw.site : "",
      project: typeof raw.project === "string" ? raw.project : "",
      effectiveJql: raw.effectiveJql,
      retainedSprints,
      counts,
      issueCount:
        typeof raw.issueCount === "number" && Number.isFinite(raw.issueCount)
          ? raw.issueCount
          : 0
    };
  } catch {
    return null;
  }
}

function parseCounts(value: unknown): Record<Folder, number> {
  const empty: Record<Folder, number> = {
    me: 0,
    team: 0,
    unassigned: 0,
    misc: 0
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(empty) as Folder[]) {
    const count = raw[key];
    if (typeof count === "number" && Number.isFinite(count)) {
      empty[key] = count;
    }
  }
  return empty;
}

function parseRetainedSprints(value: unknown): BoardSprint[] {
  if (!Array.isArray(value)) return [];
  const sprints: BoardSprint[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "number") continue;
    sprints.push({
      id: row.id,
      name: typeof row.name === "string" ? row.name : undefined,
      startDate: typeof row.startDate === "string" ? row.startDate : undefined,
      endDate: typeof row.endDate === "string" ? row.endDate : undefined,
      state: typeof row.state === "string" ? row.state : undefined
    });
  }
  return sprints;
}
