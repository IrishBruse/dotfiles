/**
 * Sync Jira issues into the jira-tickets skill via `acli jira workitem search` (Atlassian CLI).
 * Writes per-ticket markdown into `home/.agents/skills/jira-tickets/references/{me,team,unassigned}/`
 * and regenerates the skill summary at `home/.agents/skills/jira-tickets/SKILL.md`.
 *
 * When CONFIG.boardId is set, only sprints whose window overlaps today are fetched
 * (from 2 days before sprint start through 2 days after sprint end). Tickets that drop
 * out of the fetch are archived to `references/misc/` and removed once every sprint on
 * the board is past end + 2 days.
 *
 * Edit CONFIG.ts, then run: jira sync
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../CONFIG.ts";

export type Folder = "me" | "unassigned" | "team" | "misc";

export function classifyFolder(
  assignee: Record<string, unknown> | null | undefined,
  meAccountId: string,
): Folder {
  if (assignee == null) return "unassigned";
  if (assignee.accountId === meAccountId) return "me";
  return "team";
}

export function assigneeLabel(
  assignee: Record<string, unknown> | null | undefined,
): string {
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

  /** Depth-first text fragments; appends to `out` to avoid per-node array allocation. */
  function appendCollectText(out: string[], n: unknown): void {
    if (n == null) return;
    if (typeof n === "object" && n !== null && "type" in n) {
      const o = n as Record<string, unknown>;
      if (o.type === "text" && typeof o.text === "string") {
        out.push(o.text);
      }
      const content = o.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          appendCollectText(out, c);
        }
      }
    } else if (Array.isArray(n)) {
      for (const x of n) {
        appendCollectText(out, x);
      }
    }
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
        appendCollectText(inner, c);
      }
      lines.push(inner.join(""));
    } else if (t === "heading") {
      const level = Number(
        (o.attrs as { level?: number } | undefined)?.level ?? 1,
      );
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(inner, c);
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
        appendCollectText(inner, c);
      }
      lines.push(`- ${inner.join("")}`);
    } else if (t === "codeBlock") {
      const parts: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(parts, c);
      }
      const body = parts.join("");
      const lang = String(
        (o.attrs as { language?: string } | undefined)?.language ?? "",
      );
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

export function issueDescriptionMarkdown(
  fields: Record<string, unknown>,
): string {
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
  const statusBucket = statusBucketFromFields(fields);

  const md = `---
title: ${yamlScalar(summary)}
assigned: ${yamlScalar(assigned)}
type: ${yamlScalar(itype)}
url: ${url}
status: ${statusBucket}
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

function ticketKeyFromFilename(filename: string): string | null {
  const m = /^([A-Z]+-\d+)\.md$/.exec(filename);
  return m ? m[1] : null;
}

/** Keep tickets from sprints within this many days before start and after end. */
export const SPRINT_RETENTION_BUFFER_MS = 2 * 24 * 60 * 60 * 1000;

export type BoardSprint = {
  id: number;
  startDate?: string;
  endDate?: string;
  state?: string;
};

function parseSprintInstant(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Inclusive window: [start - 2d, end + 2d]. Sprints missing dates are excluded. */
export function isSprintInRetentionWindow(
  sprint: BoardSprint,
  nowMs: number = Date.now(),
): boolean {
  const start = parseSprintInstant(sprint.startDate);
  const end = parseSprintInstant(sprint.endDate);
  if (start == null || end == null) return false;
  const windowStart = start - SPRINT_RETENTION_BUFFER_MS;
  const windowEnd = end + SPRINT_RETENTION_BUFFER_MS;
  return nowMs >= windowStart && nowMs <= windowEnd;
}

export function sprintsInRetentionWindow(
  sprints: BoardSprint[],
  nowMs: number = Date.now(),
): BoardSprint[] {
  return sprints.filter((s) => isSprintInRetentionWindow(s, nowMs));
}

/** Delete misc tickets not in the current fetch once any sprint is past end + 2d. */
export function miscDeleteCutoffMs(
  sprints: BoardSprint[],
  nowMs: number = Date.now(),
): number {
  let cutoff = 0;
  for (const sprint of sprints) {
    const end = parseSprintInstant(sprint.endDate);
    if (end == null) continue;
    const sprintCutoff = end + SPRINT_RETENTION_BUFFER_MS;
    if (nowMs > sprintCutoff) {
      cutoff = Math.max(cutoff, sprintCutoff);
    }
  }
  return cutoff;
}

export function shouldDeleteMiscTicket(
  inCurrentFetch: boolean,
  sprints: BoardSprint[],
  nowMs: number = Date.now(),
): boolean {
  if (inCurrentFetch) return false;
  const cutoff = miscDeleteCutoffMs(sprints, nowMs);
  return cutoff > 0 && nowMs > cutoff;
}

export type WriteBoardResult = {
  counts: Record<Folder, number>;
  added: string[];
  updated: string[];
  moved: Array<{ key: string; from: Folder; to: Folder }>;
  archived: string[];
  deleted: string[];
};

export function writeBoard(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  options: {
    outputRoot: string;
    meAccountId: string;
    siteHost: string;
    clean: boolean;
    /** All board sprints (for misc cleanup vs sprint end + 2d). */
    boardSprints: BoardSprint[];
    nowMs?: number;
  },
): WriteBoardResult {
  const { outputRoot, meAccountId, siteHost, boardSprints } = options;
  const nowMs = options.nowMs ?? Date.now();
  const roots: Record<Folder, string> = {
    me: path.join(outputRoot, "me"),
    unassigned: path.join(outputRoot, "unassigned"),
    team: path.join(outputRoot, "team"),
    misc: path.join(outputRoot, "misc"),
  };
  for (const p of Object.values(roots)) {
    fs.mkdirSync(p, { recursive: true });
  }

  const fetchedKeys = new Set<string>();
  for (const { key } of issuesWithKeys(issues)) {
    fetchedKeys.add(key);
  }

  const existingFiles = new Map<string, { folder: Folder; path: string }>();
  for (const [folder, dir] of Object.entries(roots)) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const key = ticketKeyFromFilename(f);
      if (key) {
        existingFiles.set(key, { folder: folder as Folder, path: path.join(dir, f) });
      }
    }
  }

  const archived: string[] = [];
  for (const [key, { folder, path: filePath }] of existingFiles.entries()) {
    if (fetchedKeys.has(key)) continue;
    if (folder !== "misc") {
      const miscPath = path.join(roots.misc, `${key}.md`);
      fs.renameSync(filePath, miscPath);
      existingFiles.set(key, { folder: "misc", path: miscPath });
      archived.push(key);
    }
  }

  const deleted: string[] = [];
  for (const f of fs.readdirSync(roots.misc)) {
    if (!f.endsWith(".md")) continue;
    const filePath = path.join(roots.misc, f);
    const key = ticketKeyFromFilename(f);
    if (
      key &&
      shouldDeleteMiscTicket(fetchedKeys.has(key), boardSprints, nowMs)
    ) {
      fs.unlinkSync(filePath);
      if (key) {
        existingFiles.delete(key);
        deleted.push(key);
      }
    }
  }

  const added: string[] = [];
  const updated: string[] = [];
  const moved: Array<{ key: string; from: Folder; to: Folder }> = [];
  const counts: Record<Folder, number> = { me: 0, unassigned: 0, team: 0, misc: 0 };

  for (const { key, fields } of issuesWithKeys(issues)) {
    const { folder, body } = formatTicketMarkdown(
      key,
      fields,
      siteHost,
      meAccountId,
    );
    const out = path.join(roots[folder], `${key}.md`);
    const prev = existingFiles.get(key);

    if (!prev) {
      added.push(key);
    } else if (prev.folder !== folder) {
      fs.unlinkSync(prev.path);
      moved.push({ key, from: prev.folder, to: folder });
    } else {
      let prior = "";
      try {
        prior = fs.readFileSync(prev.path, "utf-8");
      } catch {
        prior = "";
      }
      if (prior !== body) updated.push(key);
    }

    fs.writeFileSync(out, body, "utf-8");
    existingFiles.set(key, { folder, path: out });
    counts[folder] += 1;
  }

  for (const f of fs.readdirSync(roots.misc)) {
    if (f.endsWith(".md")) counts.misc += 1;
  }

  const sortKeys = (keys: string[]) =>
    keys.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  sortKeys(added);
  sortKeys(updated);
  sortKeys(archived);
  sortKeys(deleted);
  moved.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }));

  return { counts, added, updated, moved, archived, deleted };
}

/** Single-line summary safe for the skill list (matches Python board_sync_lib). */
export function ticketsSkillOneLine(summary: string): string {
  return String(summary ?? "")
    .replace(/\n/g, " ")
    .replace(/```/g, "'''")
    .trim();
}

export type StatusBucket =
  | "todo"
  | "inProgress"
  | "codeReview"
  | "inTest"
  | "done";

const STATUS_HEADINGS: Record<StatusBucket, string> = {
  todo: "Todo",
  inProgress: "In progress",
  codeReview: "Code review",
  inTest: "In test",
  done: "Done",
};

const STATUS_ORDER: StatusBucket[] = [
  "todo",
  "inProgress",
  "codeReview",
  "inTest",
  "done",
];

function emptyStatusBuckets(): Record<StatusBucket, string[]> {
  return {
    todo: [],
    inProgress: [],
    codeReview: [],
    inTest: [],
    done: [],
  };
}

/**
 * Map Jira status (name + category) into skill subsections. Tuned for typical Scrum boards;
 * anything unclear defaults to In progress.
 */
export function statusBucketFromFields(
  fields: Record<string, unknown>,
): StatusBucket {
  const raw = fields.status;
  const name =
    raw &&
    typeof raw === "object" &&
    typeof (raw as { name?: unknown }).name === "string"
      ? (raw as { name: string }).name.trim()
      : "";
  const lower = name.toLowerCase();
  const catKey =
    (raw &&
      typeof raw === "object" &&
      (raw as { statusCategory?: { key?: string } }).statusCategory?.key) ??
    "";
  const category = String(catKey).toLowerCase();

  if (
    category === "done" ||
    /^(done|closed|resolved|complete)$/i.test(name.trim())
  ) {
    return "done";
  }

  if (
    /\b(uat|qa|in test|system test|sit|staging)\b/.test(lower) ||
    (/\btest(ing)?\b/.test(lower) && !/retest/.test(lower))
  ) {
    return "inTest";
  }
  if (
    /\b(review|revising)\b/.test(lower) ||
    /code review|peer review|pull request/i.test(name)
  ) {
    return "codeReview";
  }
  if (
    category === "new" ||
    /^(to do|open)$/i.test(name.trim()) ||
    /backlog|ready for (dev|development|sprint)/i.test(name)
  ) {
    return "todo";
  }
  if (
    category === "indeterminate" ||
    /progress|develop|active|wip|build|implementation/i.test(lower)
  ) {
    return "inProgress";
  }
  return "inProgress";
}

function formatStatusSubsections(
  byStatus: Record<StatusBucket, string[]>,
): string {
  const sortLines = (lines: string[]) =>
    lines.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  const parts: string[] = [];
  for (const bucket of STATUS_ORDER) {
    const lines = byStatus[bucket];
    if (lines.length === 0) continue;
    sortLines(lines);
    parts.push(`**${STATUS_HEADINGS[bucket]}:**\n\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}

export function formatJiraTicketsSkillMd(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string,
): string {
  const me = emptyStatusBuckets();
  const team = emptyStatusBuckets();
  const unassigned = emptyStatusBuckets();
  const misc = emptyStatusBuckets();

  for (const { key, fields } of issuesWithKeys(issues)) {
    const summary = ticketsSkillOneLine(
      typeof fields.summary === "string" ? fields.summary : "",
    );
    const assignee = assigneeRecord(fields.assignee);
    const label = assigneeLabel(assignee);
    const line = `- ${key}: ${summary} — \`${label}\``;
    const bucket = statusBucketFromFields(fields);
    const folder = classifyFolder(assignee, meAccountId);
    if (folder === "me") me[bucket].push(line);
    else if (folder === "unassigned") unassigned[bucket].push(line);
    else if (folder === "team") team[bucket].push(line);
    else misc[bucket].push(line);
  }

  const section = (heading: string, byStatus: Record<StatusBucket, string[]>) => {
    const body = formatStatusSubsections(byStatus);
    if (body) return `## ${heading}\n\n${body}`;
    return `## ${heading}`;
  };

  const boardSections = [
    section("My tickets", me),
    section("Teammates", team),
    section("Unassigned", unassigned),
    section("Misc (outside current sprint fetch)", misc),
  ];

  return `---
name: jira-tickets
description: >
  This skill contains in plaintext the current state of the board no need for MCP. 
  Use when needing to get the current state of the Jira Board, when needing to get a ticket for a PR.
---

# Board

Here is the current Jira board status.
For the full description of any ticket below, read \`references/{me,team,unassigned,misc}/<KEY>.md\`
Example: \`references/me/NOVACORE-12345.md\`

${boardSections.join("\n\n")}
`;
}

function readTicketMarkdown(filePath: string): {
  key: string;
  fields: Record<string, unknown>;
} | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const key = path.basename(filePath, ".md");
    const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
    if (!frontmatterMatch) return null;

    const fm = frontmatterMatch[1];
    const fields: Record<string, unknown> = {};

    const titleMatch = /^title:\s*(.+)$/m.exec(fm);
    if (titleMatch) {
      fields.summary = JSON.parse(titleMatch[1]);
    }

    const assignedMatch = /^assigned:\s*(.+)$/m.exec(fm);
    if (assignedMatch) {
      const name = JSON.parse(assignedMatch[1]);
      fields.assignee = name === "Unassigned" ? null : { displayName: name };
    }

    const statusMatch = /^status:\s*(\S+)$/m.exec(fm);
    if (statusMatch) {
      fields.status = { name: statusMatch[1] };
    }

    return { key, fields };
  } catch {
    return null;
  }
}

export function writeJiraTicketsSkill(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  skillPath: string,
  meAccountId: string,
): void {
  const miscDir = path.join(BOARD_OUTPUT_ROOT, "misc");
  const miscIssues: Array<{ key?: string; fields?: Record<string, unknown> }> = [];

  if (fs.existsSync(miscDir)) {
    for (const f of fs.readdirSync(miscDir)) {
      if (!f.endsWith(".md")) continue;
      const parsed = readTicketMarkdown(path.join(miscDir, f));
      if (parsed) {
        miscIssues.push({ key: parsed.key, fields: parsed.fields });
      }
    }
  }

  const allIssues = [...issues, ...miscIssues];
  const body = formatJiraTicketsSkillMd(allIssues, meAccountId);
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, body, "utf-8");
}

/** Skill folder: `<dotfiles>/home/.agents/skills/jira-tickets/` (dotfiles root = three levels up from this tool). */
const JIRA_TICKETS_SKILL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "home",
  ".agents",
  "skills",
  "jira-tickets",
);

/** Per-ticket markdown lives under `<skill>/references/{me,team,unassigned}/` so the skill self-references its own detail. */
const BOARD_OUTPUT_ROOT = path.join(JIRA_TICKETS_SKILL_DIR, "references");

const JIRA_TICKETS_SKILL_PATH = path.join(JIRA_TICKETS_SKILL_DIR, "SKILL.md");

/** Atlassian CLI binary (must be on `PATH` or change this string). */
const ACLI = "acli";

const SEARCH_FIELDS = "key,summary,assignee,issuetype,description,status";

const VERBOSE = process.env.JIRA_SYNC_VERBOSE === "1";

function log(msg: string): void {
  if (!VERBOSE) return;
  process.stderr.write(`jira sync: ${msg}\n`);
}

function formatKeyList(keys: string[]): string {
  return keys.join(", ");
}

function printSyncSummary(options: {
  boardId: string | null;
  sprintIds: number[];
  issueCount: number;
  result: WriteBoardResult;
  outRoot: string;
  skillPath: string;
}): void {
  const { boardId, sprintIds, issueCount, result, outRoot, skillPath } =
    options;
  const { counts, added, updated, moved, archived, deleted } = result;
  const sprint =
    sprintIds.length > 0 ? sprintIds.join(", ") : "(no board filter)";
  const board = boardId ? `board ${boardId}, ` : "";
  const lines: string[] = [
    `Jira sync: ${board}sprint ${sprint}`,
    `Fetched ${issueCount} issue(s) from Jira`,
  ];

  const sprintTotal = counts.me + counts.team + counts.unassigned;
  lines.push(
    `References: ${sprintTotal} in sprint (me ${counts.me}, team ${counts.team}, unassigned ${counts.unassigned})` +
      (counts.misc > 0 ? `, ${counts.misc} in misc` : ""),
  );

  if (added.length > 0) {
    lines.push(`Added (${added.length}): ${formatKeyList(added)}`);
  }
  if (updated.length > 0) {
    lines.push(`Updated (${updated.length}): ${formatKeyList(updated)}`);
  }
  if (moved.length > 0) {
    const detail = moved
      .map((m) => `${m.key} ${m.from} -> ${m.to}`)
      .join(", ");
    lines.push(`Moved (${moved.length}): ${detail}`);
  }
  if (archived.length > 0) {
    lines.push(
      `Archived to misc (${archived.length}): ${formatKeyList(archived)}`,
    );
  }
  if (deleted.length > 0) {
    lines.push(
      `Removed from misc (${deleted.length}): ${formatKeyList(deleted)}`,
    );
  }

  const changeCount =
    added.length +
    updated.length +
    moved.length +
    archived.length +
    deleted.length;
  if (changeCount === 0) {
    lines.push("No file changes (all tickets already up to date)");
  }

  lines.push(`Output: ${outRoot}`);
  lines.push(`Skill: ${skillPath}`);
  process.stdout.write(`${lines.join("\n")}\n`);
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

/** acli --paginate on board list-sprints concatenates one JSON page object per line chunk. */
function parseConcatenatedJsonObjects(raw: string): unknown[] {
  const objects: unknown[] = [];
  let pos = 0;
  while (pos < raw.length) {
    while (pos < raw.length && raw[pos] !== "{" && raw[pos] !== "[") {
      pos++;
    }
    if (pos >= raw.length) break;
    const start = pos;
    const open = raw[pos];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let found = false;
    for (let i = pos; i < raw.length; i++) {
      const c = raw[i];
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          objects.push(JSON.parse(raw.slice(start, i + 1)) as unknown);
          pos = i + 1;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }
  return objects;
}

function parseAcliStdoutJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed) as unknown;
  } catch (firstErr) {
    const objects = parseConcatenatedJsonObjects(trimmed);
    if (objects.length === 0) {
      const hint =
        firstErr instanceof Error ? firstErr.message : String(firstErr);
      throw new Error(
        `Expected JSON from acli (${hint}); got: ${trimmed.slice(0, 200)}…`,
      );
    }
    if (objects.length === 1) return objects[0];
    return objects;
  }
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
  return parseAcliStdoutJson(raw);
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

function isSprintListPage(value: unknown): value is { sprints?: unknown } {
  return value != null && typeof value === "object" && "sprints" in value;
}

function parseBoardSprintsFromAcli(data: unknown): BoardSprint[] {
  if (!isSprintListPage(data)) return [];
  const sprints = data.sprints;
  if (!Array.isArray(sprints)) return [];
  const out: BoardSprint[] = [];
  for (const s of sprints) {
    if (!s || typeof s !== "object" || !("id" in s)) continue;
    const row = s as {
      id?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      state?: unknown;
    };
    if (typeof row.id !== "number") continue;
    out.push({
      id: row.id,
      startDate:
        typeof row.startDate === "string" ? row.startDate : undefined,
      endDate: typeof row.endDate === "string" ? row.endDate : undefined,
      state: typeof row.state === "string" ? row.state : undefined,
    });
  }
  return out;
}

function mergeBoardSprintPages(data: unknown): BoardSprint[] {
  const pages: unknown[] = Array.isArray(data)
    ? data.filter(isSprintListPage)
    : isSprintListPage(data)
      ? [data]
      : [];
  const byId = new Map<number, BoardSprint>();
  for (const page of pages) {
    for (const sprint of parseBoardSprintsFromAcli(page)) {
      byId.set(sprint.id, sprint);
    }
  }
  return [...byId.values()];
}

function fetchBoardSprints(acli: string, boardId: string): BoardSprint[] {
  const data = runAcliJson(acli, [
    "jira",
    "board",
    "list-sprints",
    "--id",
    boardId,
    "--state",
    "active,closed,future",
    "--json",
    "--paginate",
  ]);
  return mergeBoardSprintPages(data);
}

/** Sync Jira → skill markdown; returns 0 on success. */
export function run(): number {
  try {
    return runImpl();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`jira sync: ${msg}\n`);
    return 1;
  }
}

function runImpl(): number {
  const jql = nonEmpty(CONFIG.boardJql);
  const meAccountId = nonEmpty(CONFIG.meAccountId);
  let siteHost = nonEmpty(CONFIG.site);
  const clean = CONFIG.clean;
  const boardId = nonEmpty(CONFIG.boardId);

  if (!jql) {
    process.stderr.write("jira sync: set CONFIG.boardJql.\n");
    return 1;
  }
  if (!meAccountId) {
    process.stderr.write("jira sync: set CONFIG.meAccountId.\n");
    return 1;
  }
  if (!siteHost) {
    process.stderr.write("jira sync: set CONFIG.site.\n");
    return 1;
  }
  siteHost = normalizeSiteHost(siteHost);

  let effectiveJql = jql;
  let sprintIds: number[] = [];
  let boardSprints: BoardSprint[] = [];
  if (boardId) {
    log(
      `board id ${boardId} — resolving sprints within 2d of start/end on this board…`,
    );
    boardSprints = fetchBoardSprints(ACLI, boardId);
    const retained = sprintsInRetentionWindow(boardSprints);
    sprintIds = retained.map((s) => s.id);
    if (sprintIds.length === 0) {
      process.stderr.write(
        `jira sync: no sprints in retention window (±2 days of start/end) on board ${boardId}.\n`,
      );
      return 1;
    }
    log(`retained sprint id(s) on board: ${sprintIds.join(", ")}`);
    effectiveJql = scopeJqlToBoardSprints(effectiveJql, sprintIds);
  }

  const outRoot = path.resolve(BOARD_OUTPUT_ROOT);
  log(`site ${siteHost}, output ${outRoot}, clean=${clean}`);
  log(`JQL ${truncate(effectiveJql, 120)}`);
  log("fetching issues from Jira via acli…");
  if (!VERBOSE) {
    process.stderr.write("jira sync: fetching from Jira...\n");
  }

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
    process.stderr.write("jira sync: expected JSON array from acli.\n");
    return 1;
  }

  log(`received ${data.length} issue(s).`);
  log("writing ticket markdown…");

  const issues = data as Array<{
    key?: string;
    fields?: Record<string, unknown>;
  }>;

  const result = writeBoard(issues, {
    outputRoot: outRoot,
    meAccountId,
    siteHost,
    clean,
    boardSprints,
  });

  log(`writing jira-tickets skill → ${JIRA_TICKETS_SKILL_PATH}`);
  writeJiraTicketsSkill(issues, JIRA_TICKETS_SKILL_PATH, meAccountId);

  log("done.");
  printSyncSummary({
    boardId,
    sprintIds,
    issueCount: issues.length,
    result,
    outRoot,
    skillPath: JIRA_TICKETS_SKILL_PATH,
  });
  return 0;
}
