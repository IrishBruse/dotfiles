/**
 * Sync Jira issues into the jira-board skill via `acli jira workitem search`.
 */
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import { runAcliJson, runAcliJsonAsync } from "../../../.lib/acli.ts";
import { createConcurrencyLimiter } from "../../../.lib/concurrency.ts";
import { writeJiraTicketsSkill } from "./skill.ts";
import { sprintsInRetentionWindow, writeBoard } from "./write.ts";
import { CONFIG } from "../../CONFIG.ts";
import {
  JIRA_SEARCH_FIELDS,
  JIRA_VIEW_EXTRA_FIELDS,
  normalizeSiteHost
} from "../../format.ts";
import type { BoardSprint, SyncResult, WriteBoardResult } from "../../types.ts";

/** Skill folder: `~/.agents/skills/jira-board/` */
const JIRA_BOARD_SKILL_DIR = path.resolve(
  homedir(),
  ".agents",
  "skills",
  "jira-board"
);

/** Per-ticket markdown under `<skill>/references/{me,team,unassigned}/`. */
export const BOARD_OUTPUT_ROOT = path.join(JIRA_BOARD_SKILL_DIR, "references");

const JIRA_BOARD_SKILL_PATH = path.join(JIRA_BOARD_SKILL_DIR, "SKILL.md");
const JIRA_BOARD_SPRINT_JSON_PATH = path.join(
  JIRA_BOARD_SKILL_DIR,
  "sprint.json"
);

const ACLI = "acli";
const ENRICH_CONCURRENCY = 4;
const VERBOSE = process.env.JIRA_SYNC_VERBOSE === "1";
const LOG_PREFIX = "jira board sync:";

function log(msg: string): void {
  if (!VERBOSE) return;
  process.stderr.write(`${LOG_PREFIX} ${msg}\n`);
}

function workitemViewFields(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const fields = (data as { fields?: Record<string, unknown> }).fields;
  return fields ?? {};
}

async function fetchWorkitemViewFieldsAsync(
  key: string,
  fields: string,
  acli = ACLI
): Promise<Record<string, unknown>> {
  const data = await runAcliJsonAsync(
    ["jira", "workitem", "view", key, "--fields", fields, "--json"],
    acli
  );
  return workitemViewFields(data);
}

/** Merge view-only fields into issues returned by `workitem search`. */
export async function enrichIssuesWithViewFieldsAsync(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  fields: string,
  acli = ACLI
): Promise<void> {
  const limit = createConcurrencyLimiter(ENRICH_CONCURRENCY);
  await Promise.all(
    issues.map((issue) =>
      limit(async () => {
        const key = issue.key;
        if (typeof key !== "string" || !key) return;
        const extra = await fetchWorkitemViewFieldsAsync(key, fields, acli);
        issue.fields = { ...(issue.fields ?? {}), ...extra };
      })
    )
  );
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
  sprintJsonPath: string;
}): void {
  const {
    boardId,
    sprintIds,
    issueCount,
    result,
    outRoot,
    skillPath,
    sprintJsonPath
  } = options;
  const { counts, added, updated, moved, archived, deleted } = result;
  const sprint =
    sprintIds.length > 0 ? sprintIds.join(", ") : "(no board filter)";
  const board = boardId ? `board ${boardId}, ` : "";
  const lines: string[] = [
    `Jira sync: ${board}sprint ${sprint}`,
    `Fetched ${issueCount} issue(s) from Jira`
  ];

  const sprintTotal = counts.me + counts.team + counts.unassigned;
  lines.push(
    `References: ${sprintTotal} in sprint (me ${counts.me}, team ${counts.team}, unassigned ${counts.unassigned})` +
      (counts.misc > 0 ? `, ${counts.misc} in misc` : "")
  );

  if (updated.length > 0) {
    lines.push(`Updated (${updated.length}): ${formatKeyList(updated)}`);
  }
  if (moved.length > 0) {
    const detail = moved.map((m) => `${m.key} ${m.from} -> ${m.to}`).join(", ");
    lines.push(`Moved (${moved.length}): ${detail}`);
  }
  if (archived.length > 0) {
    lines.push(
      `Archived to misc (${archived.length}): ${formatKeyList(archived)}`
    );
  }
  if (deleted.length > 0) {
    lines.push(
      `Removed from misc (${deleted.length}): ${formatKeyList(deleted)}`
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
  lines.push(`Sprint: ${sprintJsonPath}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}...`;
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

function runAcliJsonLogged(acli: string, args: string[]): unknown {
  log(`run ${acli} ${summarizeAcliArgs(args)}`);
  return runAcliJson(args, acli);
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
      startDate: typeof row.startDate === "string" ? row.startDate : undefined,
      endDate: typeof row.endDate === "string" ? row.endDate : undefined,
      state: typeof row.state === "string" ? row.state : undefined
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
  const data = runAcliJsonLogged(acli, [
    "jira",
    "board",
    "list-sprints",
    "--id",
    boardId,
    "--state",
    "active,closed,future",
    "--json",
    "--paginate"
  ]);
  return mergeBoardSprintPages(data);
}

/** Sync Jira -> skill markdown; returns 0 on success. */
export async function run(): Promise<number> {
  return (await runWithResult()).code;
}

let lastSyncError: string | undefined;

function syncFail(msg: string): number {
  process.stderr.write(`${LOG_PREFIX} ${msg}\n`);
  lastSyncError = msg;
  return 1;
}

/** Like `run()`, but includes the user-facing error message when `code !== 0`. */
export async function runWithResult(): Promise<SyncResult> {
  lastSyncError = undefined;
  try {
    const code = await runImpl();
    if (code !== 0) {
      return { code, error: lastSyncError ?? "Sync failed" };
    }
    return { code };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${LOG_PREFIX} ${msg}\n`);
    return { code: 1, error: msg };
  }
}

async function runImpl(): Promise<number> {
  const jql = nonEmpty(CONFIG.boardJql);
  const meAccountId = nonEmpty(CONFIG.meAccountId);
  let siteHost = nonEmpty(CONFIG.site);
  const clean = CONFIG.clean;
  const boardId = nonEmpty(CONFIG.boardId);

  if (!jql) {
    return syncFail("set CONFIG.boardJql.");
  }
  if (!meAccountId) {
    return syncFail("set CONFIG.meAccountId.");
  }
  if (!siteHost) {
    return syncFail("set CONFIG.site.");
  }
  siteHost = normalizeSiteHost(siteHost);

  let effectiveJql = jql;
  let sprintIds: number[] = [];
  let boardSprints: BoardSprint[] = [];
  if (boardId) {
    log(
      `board id ${boardId} — resolving sprints within 2d of start/end on this board…`
    );
    boardSprints = fetchBoardSprints(ACLI, boardId);
    const retained = sprintsInRetentionWindow(boardSprints);
    sprintIds = retained.map((s) => s.id);
    if (sprintIds.length === 0) {
      return syncFail(
        `no sprints in retention window (±2 days of start/end) on board ${boardId}.`
      );
    }
    log(`retained sprint id(s) on board: ${sprintIds.join(", ")}`);
    effectiveJql = scopeJqlToBoardSprints(effectiveJql, sprintIds);
  }

  const outRoot = path.resolve(BOARD_OUTPUT_ROOT);
  log(`site ${siteHost}, output ${outRoot}, clean=${clean}`);
  log(`JQL ${truncate(effectiveJql, 120)}`);
  log("fetching issues from Jira via acli…");
  if (!VERBOSE) {
    process.stderr.write(`${LOG_PREFIX} fetching from Jira...\n`);
  }

  const data = runAcliJsonLogged(ACLI, [
    "jira",
    "workitem",
    "search",
    "--jql",
    effectiveJql,
    "--json",
    "--paginate",
    "--fields",
    JIRA_SEARCH_FIELDS
  ]);

  if (!Array.isArray(data)) {
    return syncFail("expected JSON array from acli.");
  }

  log(`received ${data.length} issue(s).`);

  const issues = data as Array<{
    key?: string;
    fields?: Record<string, unknown>;
  }>;

  if (issues.length > 0) {
    log(`enriching ${issues.length} issue(s) with view-only fields…`);
    if (!VERBOSE) {
      process.stderr.write(
        `${LOG_PREFIX} enriching ${issues.length} issue(s)...\n`
      );
    }
    await enrichIssuesWithViewFieldsAsync(issues, JIRA_VIEW_EXTRA_FIELDS, ACLI);
  }

  log("writing ticket markdown…");

  const result = writeBoard(issues, {
    outputRoot: outRoot,
    meAccountId,
    siteHost,
    clean,
    boardSprints
  });

  log(
    `writing jira-board skill → ${JIRA_BOARD_SKILL_PATH}, ${JIRA_BOARD_SPRINT_JSON_PATH}`
  );
  writeJiraTicketsSkill(issues, JIRA_BOARD_SKILL_PATH, meAccountId, outRoot);

  log("done.");
  printSyncSummary({
    boardId,
    sprintIds,
    issueCount: issues.length,
    result,
    outRoot,
    skillPath: JIRA_BOARD_SKILL_PATH,
    sprintJsonPath: JIRA_BOARD_SPRINT_JSON_PATH
  });
  return 0;
}
