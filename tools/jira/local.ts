import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BROWSE_KEY_RE = /\/browse\/([A-Z][A-Z0-9_]*-\d+)/;

/** True when markdown frontmatter links to a Jira issue key. */
export function jiraTicketKeyInMarkdown(content: string, key: string): boolean {
  return content.includes(`/browse/${key}`);
}

export type LocalTicket = {
  key: string;
  path: string;
  relPath: string;
  typeDir: string;
  title: string;
  assigned: string;
  issueType: string;
  url: string;
  status: string;
  created: string;
  updated: string;
  description: string;
};

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
  const keyMatch = url.match(BROWSE_KEY_RE);
  if (!keyMatch) return null;

  const key = keyMatch[1]!;
  const title = parseFrontmatterScalar(fm, "title") || key;

  return {
    key,
    path: filePath,
    relPath: path.relative(cwd, filePath) || filePath,
    typeDir: path.basename(path.dirname(filePath)),
    title,
    assigned: parseFrontmatterScalar(fm, "assigned"),
    issueType: parseFrontmatterScalar(fm, "type"),
    url,
    status: parseFrontmatterLine(fm, "status"),
    created: parseFrontmatterScalar(fm, "created"),
    updated: parseFrontmatterScalar(fm, "updated"),
    description: m[2].trim()
  };
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
    const typeDir = path.join(root, ent.name);
    for (const file of fs.readdirSync(typeDir)) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(typeDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseTicketMarkdown(content, filePath, cwd);
      if (parsed) tickets.push(parsed);
    }
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

/** Resolve a ticket key to its on-disk markdown path under cwd. */
export function localTicketPath(
  key: string,
  cwd = process.cwd()
): string | null {
  const root = jiraRootDir(cwd);
  if (!fs.existsSync(root)) return null;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const typeDir = path.join(root, ent.name);
    for (const file of fs.readdirSync(typeDir)) {
      if (!file.endsWith(".md")) continue;
      const p = path.join(typeDir, file);
      const head = fs.readFileSync(p, "utf-8").slice(0, 2048);
      if (jiraTicketKeyInMarkdown(head, key)) return p;
    }
  }
  return null;
}
