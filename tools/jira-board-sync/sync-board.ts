#!/usr/bin/env node
/**
 * Sync Jira issues to ~/jira-board-style folders using `acli jira workitem search` (Atlassian CLI).
 * Edit CONFIG.ts, then run: node bin/jira-board-sync.js
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { writeBoard, writeJiraTicketsSkill } from "./board_lib.ts";
import { CONFIG } from "./CONFIG.ts";

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
    const a = args[i]!;
    if (a === "--jql" && i + 1 < args.length) {
      parts.push("--jql", truncate(args[i + 1]!, 100));
      i += 1;
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
    throw new Error(`Failed to run ${acli}: ${(r.error as Error).message}`);
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
  } catch {
    throw new Error(`Expected JSON from acli; got: ${raw.slice(0, 200)}…`);
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
  siteHost = siteHost.replace(/^https?:\/\//, "").replace(/\/$/, "");

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
