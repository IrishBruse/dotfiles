import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import { parseBoardSprintRows } from "./board-sprint.ts";
import type {
  BoardContent,
  BoardSection,
  BoardSections,
  BoardSprint,
  BoardTicket,
  Folder,
  StatusBucket
} from "./types.ts";

/** Cached workspace context written by `jira sync`. */
export function boardInfoCachePath(baseDir = homedir()): string {
  return path.join(baseDir, ".config", "jira", "info.json");
}

/** Cached board state written by `jira sync`. */
export function boardCachePath(baseDir = homedir()): string {
  return path.join(baseDir, ".config", "jira", "board.json");
}

/** One project issue type from `jira project view`. */
export type CachedIssueType = {
  name: string;
  hierarchyLevel: number;
  subtask: boolean;
};

/** Cached workspace context written by `jira sync`. */
export type BoardInfoCache = {
  syncedAt: string;
  boardId: string | null;
  site: string;
  project: string;
  projectName: string;
  effectiveJql: string;
  retainedSprints: BoardSprint[];
  counts: Record<Folder, number>;
  issueCount: number;
  localTicketCount: number;
  issueTypes: string[];
  issueTypeDetails: CachedIssueType[];
  statuses: string[];
  featureTeamName: string;
  featureTeamOptionId: string;
  meDisplayName: string;
};

/** Persist workspace context for `jira info`. */
export function writeBoardInfoCache(
  cache: BoardInfoCache,
  baseDir = homedir()
): void {
  writeJsonAtomically(boardInfoCachePath(baseDir), cache);
}

/** Persist board sections for `jira board`. */
export function writeBoardCache(
  cache: BoardContent,
  baseDir = homedir()
): void {
  writeJsonAtomically(boardCachePath(baseDir), cache);
}

function writeJsonAtomically(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  fs.renameSync(tempPath, filePath);
}

const FOLDER_KEYS: Folder[] = ["me", "team", "unassigned", "misc"];

const STATUS_BUCKETS: StatusBucket[] = [
  "todo",
  "inProgress",
  "codeReview",
  "inTest",
  "done"
];

const SECTION_KEYS: (keyof BoardSections)[] = [
  "myTickets",
  "teammates",
  "unassigned",
  "misc"
];

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

function parseOptionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseIssueTypeDetails(value: unknown): CachedIssueType[] {
  if (!Array.isArray(value)) return [];
  const out: CachedIssueType[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || !row.name.trim()) continue;
    const hierarchyLevel =
      typeof row.hierarchyLevel === "number" && Number.isFinite(row.hierarchyLevel)
        ? row.hierarchyLevel
        : 0;
    out.push({
      name: row.name.trim(),
      hierarchyLevel,
      subtask: row.subtask === true
    });
  }
  return out;
}

function parseBoardTicket(value: unknown): BoardTicket | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.key !== "string" || !raw.key.trim()) return null;
  if (typeof raw.summary !== "string") return null;
  if (typeof raw.assignee !== "string") return null;
  const ticket: BoardTicket = {
    key: raw.key.trim(),
    summary: raw.summary,
    assignee: raw.assignee
  };
  if (typeof raw.stageSince === "string" && raw.stageSince.trim()) {
    ticket.stageSince = raw.stageSince.trim();
  }
  return ticket;
}

function parseBoardSection(value: unknown): BoardSection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.heading !== "string") return null;
  if (!raw.statuses || typeof raw.statuses !== "object" || Array.isArray(raw.statuses)) {
    return null;
  }
  const statusesRaw = raw.statuses as Record<string, unknown>;
  const statuses = {} as Record<StatusBucket, BoardTicket[]>;
  for (const bucket of STATUS_BUCKETS) {
    const rows = statusesRaw[bucket];
    if (!Array.isArray(rows)) return null;
    const tickets: BoardTicket[] = [];
    for (const row of rows) {
      const ticket = parseBoardTicket(row);
      if (!ticket) return null;
      tickets.push(ticket);
    }
    statuses[bucket] = tickets;
  }
  return { heading: raw.heading, statuses };
}

function parseBoardSections(value: unknown): BoardSections | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const sections = {} as BoardSections;
  for (const key of SECTION_KEYS) {
    const section = parseBoardSection(raw[key]);
    if (!section) return null;
    sections[key] = section;
  }
  return sections;
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

  const statuses =
    raw.statuses === undefined ? [] : parseStringArray(raw.statuses);
  if (!statuses) return null;

  return {
    syncedAt: raw.syncedAt,
    boardId: raw.boardId,
    site: raw.site,
    project: raw.project,
    projectName: parseOptionalString(raw.projectName),
    effectiveJql: raw.effectiveJql,
    retainedSprints: parseBoardSprintRows(raw.retainedSprints),
    counts,
    issueCount: raw.issueCount,
    localTicketCount,
    issueTypes,
    issueTypeDetails: parseIssueTypeDetails(raw.issueTypeDetails),
    statuses,
    featureTeamName: parseOptionalString(raw.featureTeamName),
    featureTeamOptionId: parseOptionalString(raw.featureTeamOptionId),
    meDisplayName: parseOptionalString(raw.meDisplayName)
  };
}

/** Read cached board state when present. */
export function readBoardCache(baseDir = homedir()): BoardContent | null {
  const filePath = boardCachePath(baseDir);
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
  const sections = parseBoardSections(raw.sections);
  if (!sections) return null;

  return {
    syncedAt: raw.syncedAt,
    sections
  };
}
