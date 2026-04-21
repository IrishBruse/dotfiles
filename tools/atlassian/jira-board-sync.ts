#!/usr/bin/env node
/**
 * Sync Jira issues to ~/jira-board-style folders using `acli jira workitem search` (Atlassian CLI).
 * Markdown helpers mirror `.agents/skills/jira-board-sync/scripts/board_sync_lib.py`.
 * Edit CONFIG.ts, then run: node bin/jira-board-sync.js
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CONFIG } from "./CONFIG.ts";

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
  return JSON.stringify(s);
}

function assigneeRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Strip scheme and trailing slash (idempotent). */
function normalizeSiteHost(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
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
  const assignee = assigneeRecord(fields.assignee);
  const folder = classifyFolder(assignee, meAccountId);
  const assigned = assigneeLabel(assignee);
  const descriptionMd = issueDescriptionMarkdown(fields);
  const site = normalizeSiteHost(siteHost);
  const url = `https://${site}/browse/${key}`;

  const md = `---
title: ${yamlScalar(summary)}
assigned: ${yamlScalar(assigned)}
type: ${yamlScalar(itype)}
url: ${url}
---

${descriptionMd}
`;
  return { folder, body: md };
}

function* issuesWithKeys(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
): Generator<{ key: string; fields: Record<string, unknown> }> {
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    yield { key, fields: issue.fields ?? {} };
  }
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
  for (const { key, fields } of issuesWithKeys(issues)) {
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

  for (const { key, fields } of issuesWithKeys(issues)) {
    const summary = ticketsSkillOneLine(
      typeof fields.summary === "string" ? fields.summary : "",
    );
    const assignee = assigneeRecord(fields.assignee);
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

/** Fixed output tree: ~/jira-board/{me,unassigned,team}/ */
const BOARD_OUTPUT_ROOT = path.join(os.homedir(), "jira-board");

/** Fixed skill file: `<repo>/.agents/skills/jira-tickets/SKILL.md` (repo = two levels up from this tool). */
const JIRA_TICKETS_SKILL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".agents",
  "skills",
  "jira-tickets",
  "SKILL.md",
);

/** Atlassian CLI binary (must be on `PATH` or change this string). */
const ACLI = "acli";

const SEARCH_FIELDS = "key,summary,assignee,issuetype,description";

function log(msg: string): void {
  process.stderr.write(`jira-board-sync: ${msg}\n`);
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function summarizeAcliArgs(args: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === undefined) continue;
    if (a === "--jql") {
      const jql = args[i + 1];
      if (jql !== undefined) {
        parts.push("--jql", truncate(jql, 100));
        i += 1;
      }
      continue;
    }
    parts.push(a);
  }
  return parts.join(" ");
}

function nonEmpty(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function runAcliJson(acli: string, args: string[]): unknown {
  log(`run ${acli} ${summarizeAcliArgs(args)}`);
  const r = spawnSync(acli, args, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) {
    const msg = r.error instanceof Error ? r.error.message : String(r.error);
    throw new Error(`Failed to run ${acli}: ${msg}`);
  }
  if (r.status !== 0) {
    const err = r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`;
    throw new Error(err);
  }
  const raw = r.stdout?.trim() ?? "";
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Expected JSON from acli (${hint}); got: ${raw.slice(0, 200)}…`,
    );
  }
}

function stripOpenSprintsClause(jql: string): string {
  return jql
    .replace(/\s+AND\s+sprint\s+in\s+openSprints\s*\(\s*\)/gi, " ")
    .replace(/\bsprint\s+in\s+openSprints\s*\(\s*\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitJqlOrderBy(jql: string): {
  main: string;
  orderBy: string | null;
} {
  const trimmed = jql.trim();
  const m = /\s+ORDER\s+BY\s+(.+)$/i.exec(trimmed);
  if (!m) return { main: trimmed, orderBy: null };
  const main = trimmed.slice(0, m.index).trim();
  return { main, orderBy: m[1].trim() };
}

function scopeJqlToBoardSprints(userJql: string, sprintIds: number[]): string {
  const clause = `sprint in (${sprintIds.join(", ")})`;
  const stripped = stripOpenSprintsClause(userJql.trim());
  const { main, orderBy } = splitJqlOrderBy(stripped);
  if (!main) {
    return orderBy ? `${clause} ORDER BY ${orderBy}` : clause;
  }
  const core = `${clause} AND (${main})`;
  return orderBy ? `${core} ORDER BY ${orderBy}` : core;
}

function fetchActiveSprintIdsForBoard(acli: string, boardId: string): number[] {
  const data = runAcliJson(acli, [
    "jira",
    "board",
    "list-sprints",
    "--id",
    boardId,
    "--state",
    "active",
    "--json",
    "--paginate",
  ]);
  if (!data || typeof data !== "object") return [];
  const sprints = (data as { sprints?: unknown }).sprints;
  if (!Array.isArray(sprints)) return [];
  const ids: number[] = [];
  for (const s of sprints) {
    if (s && typeof s === "object" && "id" in s) {
      const id = (s as { id?: unknown }).id;
      if (typeof id === "number") ids.push(id);
    }
  }
  return ids;
}

function main(): void {
  const jql = nonEmpty(CONFIG.boardJql);
  const meAccountId = nonEmpty(CONFIG.meAccountId);
  let siteHost = nonEmpty(CONFIG.site);
  const clean = CONFIG.clean;
  const boardId = nonEmpty(CONFIG.boardId);

  if (!jql) {
    process.stderr.write("jira-board-sync: set CONFIG.boardJql.\n");
    process.exit(1);
  }
  if (!meAccountId) {
    process.stderr.write("jira-board-sync: set CONFIG.meAccountId.\n");
    process.exit(1);
  }
  if (!siteHost) {
    process.stderr.write("jira-board-sync: set CONFIG.site.\n");
    process.exit(1);
  }
  siteHost = normalizeSiteHost(siteHost);

  let effectiveJql = jql;
  if (boardId) {
    log(`board id ${boardId} — resolving active sprints on this board only…`);
    const sprintIds = fetchActiveSprintIdsForBoard(ACLI, boardId);
    if (sprintIds.length === 0) {
      process.stderr.write(
        `jira-board-sync: no active sprints on board ${boardId}.\n`,
      );
      process.exit(1);
    }
    log(`active sprint id(s) on board: ${sprintIds.join(", ")}`);
    effectiveJql = scopeJqlToBoardSprints(effectiveJql, sprintIds);
  }

  const outRoot = path.resolve(BOARD_OUTPUT_ROOT);
  log(`site ${siteHost}, output ${outRoot}, clean=${clean}`);
  log(`JQL ${truncate(effectiveJql, 120)}`);
  log("fetching issues from Jira via acli…");

  const data = runAcliJson(ACLI, [
    "jira",
    "workitem",
    "search",
    "--jql",
    effectiveJql,
    "--json",
    "--paginate",
    "--fields",
    SEARCH_FIELDS,
  ]);

  if (!Array.isArray(data)) {
    process.stderr.write("jira-board-sync: expected JSON array from acli.\n");
    process.exit(1);
  }

  log(`received ${data.length} issue(s).`);
  log(
    clean
      ? "clearing existing *.md under me/, unassigned/, team/…"
      : "keeping existing *.md (CONFIG.clean is false).",
  );
  log("writing ticket markdown…");

  const issues = data as Array<{
    key?: string;
    fields?: Record<string, unknown>;
  }>;

  const counts = writeBoard(issues, {
    outputRoot: outRoot,
    meAccountId,
    siteHost,
    clean,
  });

  log(`writing jira-tickets skill → ${JIRA_TICKETS_SKILL_PATH}`);
  writeJiraTicketsSkill(issues, JIRA_TICKETS_SKILL_PATH, meAccountId);

  log("done.");
  process.stdout.write(
    `Wrote ${counts.me + counts.team + counts.unassigned} issues to ${outRoot} (me: ${counts.me}, team: ${counts.team}, unassigned: ${counts.unassigned}). Updated jira-tickets skill: ${JIRA_TICKETS_SKILL_PATH}\n`,
  );
}

main();
