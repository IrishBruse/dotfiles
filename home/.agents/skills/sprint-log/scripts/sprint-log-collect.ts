#!/usr/bin/env -S node --experimental-strip-types
/**
 * Collect sprint-scoped work signals (Jira, git, GitHub) and write a dated markdown log.
 * Usage: sprint-log-collect [--out PATH] [--board-id ID]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BOARD_ID = "691";
const JIRA_BROWSE = "https://globalization-partners.atlassian.net/browse";
const GIT_ROOT =
  process.env.SPRINT_LOG_GIT_ROOT ?? `${process.env.HOME ?? ""}/git`;
const NOTES_DIR =
  process.env.SPRINT_LOG_DIR ?? `${process.env.HOME ?? ""}/notes/sprint-log`;

type Sprint = {
  id: number;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
};

type JiraRow = { key: string; summary: string; status: string };

type GhPr = {
  number: number;
  title: string;
  url: string;
  repo: string;
  closedAt?: string;
  updatedAt?: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): {
  outPath: string | null;
  boardId: string;
} {
  let outPath: string | null = null;
  let boardId = BOARD_ID;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out" && argv[i + 1]) {
      outPath = argv[++i];
      continue;
    }
    if (arg === "--board-id" && argv[i + 1]) {
      boardId = argv[++i];
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(`Usage: sprint-log-collect [--out PATH] [--board-id ID]

Writes a markdown sprint log for the active Jira sprint on the board.
Defaults: board ${BOARD_ID}, output ${NOTES_DIR}/<today>.md
`);
      process.exit(0);
    }
  }
  return { outPath, boardId };
}

function run(cmd: string, args: string[], opts?: { cwd?: string }): string {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: opts?.cwd,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (r.status !== 0) {
    return "";
  }
  return (r.stdout ?? "").trimEnd();
}

function runAcliJson(args: string[]): unknown {
  const r = spawnSync("acli", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (r.status !== 0) {
    return null;
  }
  const raw = (r.stdout ?? "").trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function fetchActiveSprints(boardId: string): Sprint[] {
  const data = runAcliJson([
    "jira",
    "board",
    "list-sprints",
    "--id",
    boardId,
    "--state",
    "active",
    "--json",
    "--paginate"
  ]);
  if (!data || typeof data !== "object") {
    return [];
  }
  const sprints = (data as { sprints?: unknown }).sprints;
  if (!Array.isArray(sprints)) {
    return [];
  }
  const out: Sprint[] = [];
  for (const row of sprints) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const id = o.id;
    const name = o.name;
    const startDate = o.startDate;
    const endDate = o.endDate;
    if (
      typeof id !== "number" ||
      typeof name !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      continue;
    }
    const goal = typeof o.goal === "string" ? o.goal : "";
    out.push({ id, name, goal, startDate, endDate });
  }
  return out;
}

function jiraDate(iso: string): string {
  return iso.slice(0, 10);
}

function parseJiraRows(data: unknown): JiraRow[] {
  if (!Array.isArray(data)) {
    return [];
  }
  const rows: JiraRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const key = (item as { key?: unknown }).key;
    const fields = (item as { fields?: unknown }).fields;
    if (typeof key !== "string" || !fields || typeof fields !== "object") {
      continue;
    }
    const f = fields as Record<string, unknown>;
    const summary = f.summary;
    const status = f.status;
    let statusName = "";
    if (status && typeof status === "object" && "name" in status) {
      const n = (status as { name?: unknown }).name;
      if (typeof n === "string") {
        statusName = n;
      }
    }
    if (typeof summary !== "string") {
      continue;
    }
    rows.push({ key, summary, status: statusName });
  }
  return rows;
}

function jiraSearch(jql: string, limit = 100): JiraRow[] {
  const data = runAcliJson([
    "jira",
    "workitem",
    "search",
    "--jql",
    jql,
    "--fields",
    "key,summary,status",
    "--limit",
    String(limit),
    "--json"
  ]);
  return parseJiraRows(data);
}

function findGitDirs(root: string): string[] {
  const r = spawnSync(
    "find",
    [root, "-maxdepth", "3", "-name", ".git", "-type", "d"],
    {
      encoding: "utf8"
    }
  );
  if (r.status !== 0 || !r.stdout) {
    return [];
  }
  return r.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function gitConfig(repo: string, key: string): string {
  return run("git", ["-C", repo, "config", key]);
}

function gitLogSince(repo: string, author: string, sinceIso: string): string[] {
  const since = sinceIso.slice(0, 10);
  const out = run("git", [
    "-C",
    repo,
    "log",
    `--since=${since}`,
    "--oneline",
    "--author",
    author
  ]);
  if (out === "") {
    return [];
  }
  return out.split("\n").filter((l) => l.length > 0);
}

function parseGhSearchJson(raw: string): GhPr[] {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(data)) {
    return [];
  }
  const out: GhPr[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const number = o.number;
    const title = o.title;
    const url = o.url;
    const repository = o.repository;
    if (
      typeof number !== "number" ||
      typeof title !== "string" ||
      typeof url !== "string" ||
      !repository ||
      typeof repository !== "object"
    ) {
      continue;
    }
    const repoName = (repository as { nameWithOwner?: unknown }).nameWithOwner;
    if (typeof repoName !== "string") {
      continue;
    }
    const closedAt = typeof o.closedAt === "string" ? o.closedAt : undefined;
    const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : undefined;
    out.push({ number, title, url, repo: repoName, closedAt, updatedAt });
  }
  return out;
}

function ghSearchPrs(args: string[]): GhPr[] {
  const r = spawnSync(
    "gh",
    [
      "search",
      "prs",
      ...args,
      "--json",
      "repository,number,title,url,closedAt,updatedAt"
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (r.status !== 0) {
    return [];
  }
  return parseGhSearchJson(r.stdout ?? "");
}

function collectGit(
  author: string,
  sinceIso: string
): { repo: string; lines: string[] }[] {
  if (!existsSync(GIT_ROOT)) {
    return [];
  }
  const blocks: { repo: string; lines: string[] }[] = [];
  for (const gitdir of findGitDirs(GIT_ROOT)) {
    const repo = dirname(gitdir);
    const repoName = repo.split("/").pop() ?? repo;
    const lines = gitLogSince(repo, author, sinceIso);
    if (lines.length === 0) {
      continue;
    }
    blocks.push({ repo: repoName, lines });
  }
  return blocks.sort((a, b) => a.repo.localeCompare(b.repo));
}

function tryMeetings(start: string, end: string): string[] {
  const buddy = spawnSync("which", ["icalBuddy"], { encoding: "utf8" });
  if (buddy.status !== 0 || !(buddy.stdout ?? "").trim()) {
    return [];
  }
  const from = jiraDate(start);
  const to = jiraDate(end);
  const out = run("icalBuddy", [
    "-ic",
    "Outlook",
    "-includeEventProps",
    "title,datetime",
    `eventsFrom:${from}`,
    `to:${to}`
  ]);
  if (out === "") {
    return [];
  }
  return out.split("\n").filter((l) => l.trim().length > 0);
}

function bullet(lines: string[]): string {
  if (lines.length === 0) {
    return "_None._\n";
  }
  return lines.map((l) => `- ${l}`).join("\n") + "\n";
}

function jiraBullets(rows: JiraRow[]): string {
  if (rows.length === 0) {
    return "_None._\n";
  }
  return (
    rows
      .map(
        (r) =>
          `- [${r.key}](${JIRA_BROWSE}/${r.key}): ${r.summary}${r.status ? ` _(${r.status})_` : ""}`
      )
      .join("\n") + "\n"
  );
}

function prBullets(prs: GhPr[]): string {
  if (prs.length === 0) {
    return "_None._\n";
  }
  return (
    prs
      .map((p) => `- [${p.repo}#${p.number}](${p.url}): ${p.title}`)
      .join("\n") + "\n"
  );
}

function groupJiraByStatus(rows: JiraRow[]): Map<string, JiraRow[]> {
  const map = new Map<string, JiraRow[]>();
  for (const row of rows) {
    const status = row.status || "Unknown";
    const list = map.get(status) ?? [];
    list.push(row);
    map.set(status, list);
  }
  return map;
}

function buildMarkdown(
  generated: string,
  sprint: Sprint,
  jiraDone: JiraRow[],
  jiraAssigned: JiraRow[],
  gitBlocks: { repo: string; lines: string[] }[],
  mergedPrs: GhPr[],
  openPrs: GhPr[],
  meetings: string[]
): string {
  const periodStart = jiraDate(sprint.startDate);
  const periodEnd = jiraDate(sprint.endDate);
  const doneKeys = new Set(jiraDone.map((d) => d.key));
  const active = jiraAssigned.filter((r) => !doneKeys.has(r.key));

  let jiraActiveSection = "";
  const grouped = groupJiraByStatus(active);
  for (const [status, rows] of [...grouped.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    jiraActiveSection += `### ${status}\n\n${jiraBullets(rows)}`;
  }
  if (active.length === 0) {
    jiraActiveSection = "_None._\n";
  }

  let gitSection = "";
  for (const block of gitBlocks) {
    gitSection += `### ${block.repo}\n\n${bullet(block.lines)}`;
  }
  if (gitBlocks.length === 0) {
    gitSection = "_No commits in this sprint window._\n";
  }

  const meetingsSection =
    meetings.length > 0
      ? bullet(meetings)
      : "_Calendar not available. Install `ical-buddy` and use the Outlook calendar, or add meetings manually._\n";

  const goalBlock =
    sprint.goal.trim().length > 0
      ? sprint.goal
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")
      : "> _No sprint goal set._";

  return `---
title: Sprint log — ${sprint.name}
sprint: ${sprint.name}
sprintId: ${sprint.id}
periodStart: ${periodStart}
periodEnd: ${periodEnd}
generated: ${generated}
---

# Sprint log — ${generated}

## Sprint

- **Name:** ${sprint.name} (id ${sprint.id})
- **Period:** ${periodStart} to ${periodEnd}

${goalBlock}

## Summary

_Add a short narrative after collection (group by theme, call out blockers)._

## Jira

### Done this sprint

${jiraBullets(jiraDone)}

### Active (by status)

${jiraActiveSection}

## Git commits

${gitSection}

## Pull requests

### Merged (${periodStart} to ${generated})

${prBullets(mergedPrs)}

### Open (updated this sprint)

${prBullets(openPrs)}

## Meetings

${meetingsSection}

## Notes

_Manual: Slack threads, decisions, follow-ups._
`;
}

function main(): void {
  const { outPath, boardId } = parseArgs(process.argv);
  const generated = todayIsoDate();
  const sprints = fetchActiveSprints(boardId);
  if (sprints.length === 0) {
    console.error(`No active sprint on board ${boardId}.`);
    process.exit(1);
  }

  const sprint = sprints[0]!;
  const start = jiraDate(sprint.startDate);
  const end = jiraDate(sprint.endDate);
  const sprintId = sprint.id;

  const author = run("git", ["config", "user.name"]);
  if (author === "") {
    console.error("git config user.name is not set.");
    process.exit(1);
  }

  const jiraDone = jiraSearch(
    `assignee = currentUser() AND sprint = ${sprintId} AND status changed to Done during (${start}, ${end}) ORDER BY key`
  );
  const jiraAssigned = jiraSearch(
    `assignee = currentUser() AND sprint = ${sprintId} ORDER BY status, key`
  );

  const gitBlocks = collectGit(author, sprint.startDate);

  const mergedPrs = ghSearchPrs([
    "--author",
    "@me",
    "--merged",
    "--merged-at",
    `${start}..${generated}`,
    "--limit",
    "100"
  ]);
  const openPrs = ghSearchPrs([
    "--author",
    "@me",
    "--state",
    "open",
    "--updated",
    `${start}..${generated}`,
    "--limit",
    "50"
  ]);

  const meetings = tryMeetings(sprint.startDate, sprint.endDate);
  const markdown = buildMarkdown(
    generated,
    sprint,
    jiraDone,
    jiraAssigned,
    gitBlocks,
    mergedPrs,
    openPrs,
    meetings
  );

  const target = outPath ?? join(NOTES_DIR, `${generated}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, markdown, "utf8");
  console.log(target);
}

main();
