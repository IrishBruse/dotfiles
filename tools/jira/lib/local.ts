import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { parseJiraKey } from "./jiraInput.ts";
import type { LocalTicket } from "./types.ts";

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
  cwd = process.cwd()
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
    relPath: path.relative(cwd, filePath) || filePath,
    typeDir: jiraTypeDirFromPath(filePath, cwd),
    title,
    assigned: parseFrontmatterScalar(fm, "assigned"),
    featureTeam: parseFrontmatterScalar(fm, "feature_team") || "None",
    issueType: parseFrontmatterScalar(fm, "type"),
    url,
    status: parseFrontmatterLine(fm, "status"),
    created: parseFrontmatterScalar(fm, "created"),
    updated: parseFrontmatterScalar(fm, "updated"),
    description: m[2].trim()
  };
}

function jiraTypeDirFromPath(filePath: string, cwd: string): string {
  const rel = path.relative(jiraRootDir(cwd), filePath);
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
  cwd: string,
  tickets: LocalTicket[]
): void {
  if (!fs.existsSync(dir)) return;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collectTicketFiles(fullPath, cwd, tickets);
      continue;
    }
    if (!ent.isFile() || !ent.name.endsWith(".md")) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    const parsed = parseTicketMarkdown(content, fullPath, cwd);
    if (parsed) tickets.push(parsed);
  }
}

export function jiraRootDir(cwd = process.cwd()): string {
  return path.join(cwd, "jira");
}

/** All ticket markdown files under `jira/<type>/`, sorted by type then key. */
export function listLocalTickets(cwd = process.cwd()): LocalTicket[] {
  const root = jiraRootDir(cwd);
  if (!fs.existsSync(root)) return [];

  const tickets: LocalTicket[] = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    collectTicketFiles(path.join(root, ent.name), cwd, tickets);
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
 * Count ticket markdown files under `jira/<type>/` without reading file contents.
 * @param cwd - Working directory containing the `jira/` folder.
 * @return Number of `*.md` files found.
 */
export function countLocalTickets(cwd = process.cwd()): number {
  const root = jiraRootDir(cwd);
  if (!fs.existsSync(root)) return 0;

  let count = 0;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    count += countTicketFiles(path.join(root, ent.name));
  }
  return count;
}

/** Key -> absolute path index for fast lookups within one command. */
export function buildLocalTicketIndex(
  cwd = process.cwd()
): Map<string, string> {
  const index = new Map<string, string>();
  for (const ticket of listLocalTickets(cwd)) {
    index.set(ticket.key, ticket.path);
  }
  return index;
}

/** Resolve a ticket key to its on-disk markdown path under cwd. */
export function localTicketPath(
  key: string,
  cwd = process.cwd(),
  index?: Map<string, string>
): string | null {
  if (index) {
    return index.get(key) ?? null;
  }

  const built = buildLocalTicketIndex(cwd);
  return built.get(key) ?? null;
}
