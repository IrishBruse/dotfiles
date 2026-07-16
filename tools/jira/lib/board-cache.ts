import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import { parseBoardSprintRows } from "./board-sprint.ts";
import type { BoardSprint, Folder } from "./types.ts";

/** Skill folder: `~/.agents/skills/jira-board/`. */
export function jiraBoardSkillDir(baseDir = homedir()): string {
  return path.resolve(baseDir, ".agents", "skills", "jira-board");
}

export const JIRA_BOARD_SKILL_DIR = jiraBoardSkillDir();

/** Cached workspace context written by `jira sync`. */
export function boardInfoCachePath(baseDir = homedir()): string {
  return path.join(jiraBoardSkillDir(baseDir), "info.json");
}

export type BoardInfoCache = {
  syncedAt: string;
  boardId: string | null;
  site: string;
  project: string;
  effectiveJql: string;
  retainedSprints: BoardSprint[];
  counts: Record<Folder, number>;
  issueCount: number;
  localTicketCount: number;
  issueTypes: string[];
};

/** Persist workspace context for `jira info`. */
export function writeBoardInfoCache(
  cache: BoardInfoCache,
  baseDir = homedir()
): void {
  const skillDir = jiraBoardSkillDir(baseDir);
  fs.mkdirSync(skillDir, { recursive: true });
  const filePath = boardInfoCachePath(baseDir);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(
    tempPath,
    `${JSON.stringify(cache, null, 2)}\n`,
    "utf-8"
  );
  fs.renameSync(tempPath, filePath);
}

const FOLDER_KEYS: Folder[] = ["me", "team", "unassigned", "misc"];

function parseCounts(value: unknown): Record<Folder, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const counts = {} as Record<Folder, number>;
  for (const key of FOLDER_KEYS) {
    const count = raw[key];
    if (typeof count !== "number" || !Number.isFinite(count)) {
      return null;
    }
    counts[key] = count;
  }
  return counts;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) return null;
    out.push(item.trim());
  }
  return out;
}

/** Read cached workspace context when present. */
export function readBoardInfoCache(baseDir = homedir()): BoardInfoCache | null {
  const filePath = boardInfoCachePath(baseDir);
  if (!fs.existsSync(filePath)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    if (err instanceof SyntaxError) return null;
    throw err;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const raw = parsed as Record<string, unknown>;
  if (typeof raw.syncedAt !== "string") return null;
  if (raw.boardId !== null && typeof raw.boardId !== "string") return null;
  if (typeof raw.site !== "string") return null;
  if (typeof raw.project !== "string") return null;
  if (typeof raw.effectiveJql !== "string") return null;
  if (!Array.isArray(raw.retainedSprints)) return null;

  const counts = parseCounts(raw.counts);
  if (!counts) return null;
  if (typeof raw.issueCount !== "number" || !Number.isFinite(raw.issueCount)) {
    return null;
  }

  const localTicketCount = raw.localTicketCount;
  if (
    typeof localTicketCount !== "number" ||
    !Number.isFinite(localTicketCount) ||
    localTicketCount < 0
  ) {
    return null;
  }

  const issueTypes = parseStringArray(raw.issueTypes);
  if (!issueTypes) return null;

  return {
    syncedAt: raw.syncedAt,
    boardId: raw.boardId,
    site: raw.site,
    project: raw.project,
    effectiveJql: raw.effectiveJql,
    retainedSprints: parseBoardSprintRows(raw.retainedSprints),
    counts,
    issueCount: raw.issueCount,
    localTicketCount,
    issueTypes
  };
}
