import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import process from "node:process";

import { parseJiraKey } from "./jiraInput.ts";
import type { LocalTicket } from "./types.ts";

/** Known ticket-type folder names under a mirror root. */
const TICKET_TYPE_DIRS = new Set([
  "bug",
  "bugs",
  "epic",
  "epics",
  "initiative",
  "initiatives",
  "pulse-team",
  "story",
  "stories",
  "task",
  "tasks",
  "sub-task",
  "sub-tasks"
]);

/** True when markdown frontmatter links to a Jira issue key. */
export function jiraTicketKeyInMarkdown(content: string, key: string): boolean {
  return content.includes(`/browse/${key}`);
}

function parseFrontmatterScalar(fm: string, field: string): string {
  const m = new RegExp(`^${field}:\\s*(.+)$`, "m").exec(fm);
  if (!m) return "";
  try {
    return JSON.parse(m[1]) as string;
  } catch {
    return m[1].trim();
  }
}

function parseFrontmatterLine(fm: string, field: string): string {
  const m = new RegExp(`^${field}:\\s*(\\S+)$`, "m").exec(fm);
  return m?.[1] ?? "";
}

/** Parse draft frontmatter fields before a Jira key exists. */
export function parseDraftFrontmatter(content: string): {
  title: string;
  issueType: string;
  project: string;
  parent: string;
  featureTeam: string;
  description: string;
} | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!m) return null;
  const fm = m[1];
  return {
    title: parseFrontmatterScalar(fm, "title"),
    issueType: parseFrontmatterScalar(fm, "type"),
    project: parseFrontmatterScalar(fm, "project"),
    parent: parseFrontmatterScalar(fm, "parent"),
    featureTeam: parseFrontmatterScalar(fm, "feature_team"),
    description: m[2].trim()
  };
}

/** Parse a pulled ticket markdown file into structured fields. */
export function parseTicketMarkdown(
  content: string,
  filePath: string,
  baseDir = homedir()
): LocalTicket | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!m) return null;

  const fm = m[1];
  const url = parseFrontmatterLine(fm, "url");
  const key = parseJiraKey(url);
  if (!key) return null;

  const title = parseFrontmatterScalar(fm, "title") || key;

  return {
    key,
    path: filePath,
    relPath: path.relative(baseDir, filePath) || filePath,
    typeDir: jiraTypeDirFromPath(filePath, baseDir),
    title,
    assigned: parseFrontmatterScalar(fm, "assigned"),
    featureTeam: parseFrontmatterScalar(fm, "feature_team") || "None",
    issueType: parseFrontmatterScalar(fm, "type"),
    url,
    status: parseFrontmatterScalar(fm, "status"),
    created: parseFrontmatterScalar(fm, "created"),
    updated: parseFrontmatterScalar(fm, "updated"),
    labels: parseFrontmatterLabels(fm),
    description: m[2].trim()
  };
}

/** Parse optional `labels:` JSON array from frontmatter. */
function parseFrontmatterLabels(fm: string): string[] {
  const m = /^labels:\s*(.+)$/m.exec(fm);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function jiraTypeDirFromPath(filePath: string, baseDir: string): string {
  const rel = path.relative(jiraRootDir(baseDir), filePath);
  const segment = rel.split(path.sep)[0];
  return segment || path.basename(path.dirname(filePath));
}

function countTicketFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      count += countTicketFiles(fullPath);
      continue;
    }
    if (!ent.isFile() || !ent.name.endsWith(".md")) continue;
    count += 1;
  }
  return count;
}

function collectTicketFiles(
  dir: string,
  baseDir: string,
  tickets: LocalTicket[]
): void {
  if (!fs.existsSync(dir)) return;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collectTicketFiles(fullPath, baseDir, tickets);
      continue;
    }
    if (!ent.isFile() || !ent.name.endsWith(".md")) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    const parsed = parseTicketMarkdown(content, fullPath, baseDir);
    if (parsed) tickets.push(parsed);
  }
}

/** Local ticket root: `<baseDir>/jira` (override `baseDir` in tests). */
export function jiraRootDir(baseDir = homedir()): string {
  return path.join(baseDir, "jira");
}

/**
 * True when `jiraDir` looks like a ticket mirror (type folders, markdown, or pull-sets).
 * Empty placeholder dirs are ignored so a walk-up does not stop early.
 */
export function looksLikeTicketMirrorRoot(jiraDir: string): boolean {
  if (!fs.existsSync(jiraDir)) return false;
  let st: fs.Stats;
  try {
    st = fs.statSync(jiraDir);
  } catch {
    return false;
  }
  if (!st.isDirectory()) return false;

  if (fs.existsSync(path.join(jiraDir, "pull-sets.json"))) return true;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(jiraDir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    if (ent.isFile() && ent.name.endsWith(".md")) return true;
    if (ent.isDirectory() && TICKET_TYPE_DIRS.has(ent.name.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve the base directory that owns `jira/` ticket mirrors.
 * Walks up from `startDir` for a mirror root; falls back to the home directory.
 * Board/info caches still use the home directory.
 */
export function resolveTicketBaseDir(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);
  for (;;) {
    const jiraDir = path.join(dir, "jira");
    if (looksLikeTicketMirrorRoot(jiraDir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return homedir();
}

/** Workspace pull-set file beside mirrors: `<baseDir>/jira/pull-sets.json`. */
export function pullSetsPath(baseDir = resolveTicketBaseDir()): string {
  return path.join(jiraRootDir(baseDir), "pull-sets.json");
}

export type PullSetsFile = {
  /** Set name used by bare `jira pull` when no key is given. */
  default?: string;
  /** Named JQL queries for `jira pull --set NAME`. */
  sets?: Record<string, string>;
};

/** Read workspace pull sets when the file exists. */
export function readPullSetsFile(baseDir = resolveTicketBaseDir()): PullSetsFile {
  const filePath = pullSetsPath(baseDir);
  if (!fs.existsSync(filePath)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`pull-sets.json is not valid JSON (${filePath}): ${msg}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`pull-sets.json must be a JSON object: ${filePath}`);
  }
  const record = parsed as Record<string, unknown>;
  const out: PullSetsFile = {};
  if (typeof record.default === "string" && record.default.trim()) {
    out.default = record.default.trim();
  }
  if (record.sets != null) {
    if (typeof record.sets !== "object" || Array.isArray(record.sets)) {
      throw new Error(`pull-sets.json "sets" must be an object: ${filePath}`);
    }
    const sets: Record<string, string> = {};
    for (const [name, jql] of Object.entries(record.sets)) {
      if (typeof jql !== "string" || !jql.trim()) {
        throw new Error(
          `pull-sets.json sets.${name} must be a non-empty string: ${filePath}`
        );
      }
      sets[name] = jql.trim();
    }
    out.sets = sets;
  }
  return out;
}

/** All ticket markdown files under `~/jira/<type>/`, sorted by type then key. */
export function listLocalTickets(baseDir = homedir()): LocalTicket[] {
  const root = jiraRootDir(baseDir);
  if (!fs.existsSync(root)) return [];

  const tickets: LocalTicket[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    collectTicketFiles(path.join(root, ent.name), baseDir, tickets);
  }

  tickets.sort((a, b) => {
    const typeCmp = a.typeDir.localeCompare(b.typeDir, undefined, {
      sensitivity: "base"
    });
    if (typeCmp !== 0) return typeCmp;
    return a.key.localeCompare(b.key, undefined, { sensitivity: "base" });
  });
  return tickets;
}

/**
 * Count ticket markdown files under `~/jira/<type>/` without reading file contents.
 * @param baseDir - Parent of the `jira/` folder (default: home).
 * @return Number of `*.md` files found.
 */
export function countLocalTickets(baseDir = homedir()): number {
  const root = jiraRootDir(baseDir);
  if (!fs.existsSync(root)) return 0;

  let count = 0;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    count += countTicketFiles(path.join(root, ent.name));
  }
  return count;
}

/** Grouped local ticket keys under `~/jira/<type>/`. */
export type LocalTicketsSummary = {
  count: number;
  byType: Array<{ typeDir: string; keys: string[] }>;
};

/** Summarize pulled tickets under `~/jira` for workspace context. */
export function summarizeLocalTickets(
  baseDir = homedir()
): LocalTicketsSummary {
  const groups = new Map<string, string[]>();
  for (const ticket of listLocalTickets(baseDir)) {
    const keys = groups.get(ticket.typeDir) ?? [];
    keys.push(ticket.key);
    groups.set(ticket.typeDir, keys);
  }

  const byType = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([typeDir, keys]) => ({
      typeDir,
      keys: keys.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    }));

  return { count: byType.reduce((sum, group) => sum + group.keys.length, 0), byType };
}

/** Key -> absolute path index for fast lookups within one command. */
export function buildLocalTicketIndex(
  baseDir = homedir()
): Map<string, string> {
  const index = new Map<string, string>();
  for (const ticket of listLocalTickets(baseDir)) {
    index.set(ticket.key, ticket.path);
  }
  return index;
}

/** Resolve a ticket key to its on-disk markdown path under `~/jira`. */
export function localTicketPath(
  key: string,
  baseDir = homedir(),
  index?: Map<string, string>
): string | null {
  if (index) {
    return index.get(key) ?? null;
  }

  const built = buildLocalTicketIndex(baseDir);
  return built.get(key) ?? null;
}
