/**
 * Mirrors `.agents/skills/jira-board-sync/scripts/board_sync_lib.py` for markdown output.
 */
import fs from "node:fs";
import path from "node:path";

export type Folder = "me" | "unassigned" | "team";

export function classifyFolder(
  assignee: Record<string, unknown> | null | undefined,
  meAccountId: string,
): Folder {
  if (assignee == null) return "unassigned";
  if (assignee.accountId === meAccountId) return "me";
  return "team";
}

export function assigneeLabel(assignee: Record<string, unknown> | null | undefined): string {
  if (assignee == null) return "Unassigned";
  const name = assignee.displayName;
  return typeof name === "string" ? name : "Unknown";
}

/** Best-effort ADF (Jira description) to readable markdown/plain text. */
export function adfToMarkdown(adf: unknown): string {
  if (adf == null) return "";
  if (typeof adf === "string") return adf;
  if (typeof adf !== "object") return "";

  const lines: string[] = [];

  function collectText(n: unknown): string[] {
    const parts: string[] = [];
    if (n == null) return parts;
    if (typeof n === "object" && n !== null && "type" in n) {
      const o = n as Record<string, unknown>;
      if (o.type === "text" && typeof o.text === "string") {
        parts.push(o.text);
      }
      const content = o.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          parts.push(...collectText(c));
        }
      }
    } else if (Array.isArray(n)) {
      for (const x of n) {
        parts.push(...collectText(x));
      }
    }
    return parts;
  }

  function walk(node: unknown): void {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const t = o.type;

    if (t === "paragraph") {
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        inner.push(...collectText(c));
      }
      lines.push(inner.join(""));
    } else if (t === "heading") {
      const level = Number((o.attrs as { level?: number } | undefined)?.level ?? 1);
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        inner.push(...collectText(c));
      }
      const prefix = "#".repeat(Math.max(1, Math.min(level, 6)));
      lines.push(`${prefix} ${inner.join("").trimEnd()}`);
    } else if (t === "bulletList" || t === "orderedList") {
      for (const item of (o.content as unknown[]) ?? []) {
        walk(item);
      }
    } else if (t === "listItem") {
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        inner.push(...collectText(c));
      }
      lines.push(`- ${inner.join("")}`);
    } else if (t === "codeBlock") {
      const parts: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        parts.push(...collectText(c));
      }
      const body = parts.join("");
      const lang = String((o.attrs as { language?: string } | undefined)?.language ?? "");
      lines.push(`\`\`\`${lang}\n${body}\n\`\`\``);
    } else {
      for (const c of (o.content as unknown[]) ?? []) {
        walk(c);
      }
    }
  }

  walk(adf);
  return lines.filter((line) => line.trim().length > 0).join("\n\n");
}

export function issueDescriptionMarkdown(fields: Record<string, unknown>): string {
  const desc = fields.description;
  if (desc == null) return "";
  if (typeof desc === "string") return desc;
  if (typeof desc === "object") return adfToMarkdown(desc);
  return String(desc);
}

export function yamlScalar(s: string): string {
  return JSON.stringify(s ?? "");
}

export function formatTicketMarkdown(
  key: string,
  fields: Record<string, unknown>,
  siteHost: string,
  meAccountId: string,
): { folder: Folder; body: string } {
  const summary = typeof fields.summary === "string" ? fields.summary : "";
  const itypeObj = fields.issuetype;
  const itype =
    itypeObj && typeof itypeObj === "object" && "name" in itypeObj
      ? String((itypeObj as { name?: string }).name ?? "Issue")
      : "Issue";
  const assignee =
    fields.assignee != null && typeof fields.assignee === "object"
      ? (fields.assignee as Record<string, unknown>)
      : null;
  const folder = classifyFolder(assignee, meAccountId);
  const assigned = assigneeLabel(assignee);
  const body = issueDescriptionMarkdown(fields);
  const site = siteHost
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const url = `https://${site}/browse/${key}`;

  const md = `---
title: ${yamlScalar(summary)}
assigned: ${yamlScalar(assigned)}
type: ${yamlScalar(itype)}
url: ${url}
---

${body}
`;
  return { folder, body: md };
}

export function writeBoard(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  options: {
    outputRoot: string;
    meAccountId: string;
    siteHost: string;
    clean: boolean;
  },
): Record<Folder, number> {
  const { outputRoot, meAccountId, siteHost, clean } = options;
  const roots: Record<Folder, string> = {
    me: path.join(outputRoot, "me"),
    unassigned: path.join(outputRoot, "unassigned"),
    team: path.join(outputRoot, "team"),
  };
  for (const p of Object.values(roots)) {
    fs.mkdirSync(p, { recursive: true });
  }

  if (clean) {
    for (const p of Object.values(roots)) {
      if (!fs.existsSync(p)) continue;
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith(".md")) {
          fs.unlinkSync(path.join(p, f));
        }
      }
    }
  }

  const counts: Record<Folder, number> = { me: 0, unassigned: 0, team: 0 };
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    const fields = issue.fields ?? {};
    const { folder, body } = formatTicketMarkdown(key, fields, siteHost, meAccountId);
    const out = path.join(roots[folder], `${key}.md`);
    fs.writeFileSync(out, body, "utf-8");
    counts[folder] += 1;
  }
  return counts;
}

/** Single-line summary safe for the skill list (matches Python board_sync_lib). */
export function ticketsSkillOneLine(summary: string): string {
  return String(summary ?? "")
    .replace(/\n/g, " ")
    .replace(/```/g, "'''")
    .trim();
}

export function formatJiraTicketsSkillMd(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string,
): string {
  const me: string[] = [];
  const team: string[] = [];
  const unassigned: string[] = [];

  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    const fields = issue.fields ?? {};
    const summary = ticketsSkillOneLine(
      typeof fields.summary === "string" ? fields.summary : "",
    );
    const assigneeRaw = fields.assignee;
    const assignee =
      assigneeRaw != null && typeof assigneeRaw === "object"
        ? (assigneeRaw as Record<string, unknown>)
        : null;
    const label = assigneeLabel(assignee);
    const line = `- ${key}: ${summary} — ${label}`;
    const folder = classifyFolder(assignee, meAccountId);
    if (folder === "me") me.push(line);
    else if (folder === "unassigned") unassigned.push(line);
    else team.push(line);
  }

  const sortLines = (lines: string[]) =>
    lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  sortLines(me);
  sortLines(team);
  sortLines(unassigned);

  const section = (title: string, lines: string[]) =>
    `# ${title}\n\n${lines.length > 0 ? lines.join("\n") : "(none)"}`;

  return `---
name: jira-tickets
description: This skill contains in plaintext the current state of the board no need for MCP
---

Here is the current Jira board status

${section("My tickets", me)}

${section("Teammates", team)}

${section("Unassigned", unassigned)}
`;
}

export function writeJiraTicketsSkill(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  skillPath: string,
  meAccountId: string,
): void {
  const body = formatJiraTicketsSkillMd(issues, meAccountId);
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, body, "utf-8");
}
