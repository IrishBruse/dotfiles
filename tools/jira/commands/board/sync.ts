/**
 * Sync Jira workspace into the jira-board skill via `acli jira workitem search`.
 */
import path from "node:path";
import process from "node:process";

import {
  JIRA_BOARD_SKILL_DIR,
  writeBoardInfoCache
} from "../../lib/board-cache.ts";

import {
  listBoardSprints,
  listProjectIssueTypes,
  searchWorkitems,
  viewWorkitemAsync
} from "../../lib/acli-jira.ts";
import { createConcurrencyLimiter } from "../../../.lib/concurrency.ts";
import { writeJiraTicketsSkill } from "./skill.ts";
import { sprintsInRetentionWindow } from "./write.ts";
import { CONFIG, configuredProject } from "../../lib/CONFIG.ts";
import {
  assigneeRecord,
  classifyFolder,
  JIRA_SEARCH_FIELDS,
  normalizeSiteHost
} from "../../lib/format.ts";
import { parseProjectIssueTypeNames } from "../../lib/info.ts";
import { countLocalTickets } from "../../lib/local.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";
import type { BoardSprint, Folder, SyncResult, SyncSummary } from "../../lib/types.ts";

const JIRA_BOARD_SKILL_PATH = path.join(JIRA_BOARD_SKILL_DIR, "SKILL.md");

const ACLI = "acli";
const ENRICH_CONCURRENCY = 4;
const VERBOSE = process.env.JIRA_SYNC_VERBOSE === "1";
const LOG_PREFIX = "jira sync:";

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

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
  const data = await viewWorkitemAsync(key, { fields, acli });
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

function countIssuesByFolder(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string
): Record<Folder, number> {
  const counts: Record<Folder, number> = {
    me: 0,
    team: 0,
    unassigned: 0,
    misc: 0
  };
  for (const issue of issues) {
    if (typeof issue.key !== "string" || !issue.key) continue;
    const folder = classifyFolder(
      assigneeRecord(issue.fields?.assignee),
      meAccountId
    );
    counts[folder] += 1;
  }
  return counts;
}

/** Build structured sync summary. */
export function buildSyncSummary(options: {
  boardId: string | null;
  sprintIds: number[];
  issueCount: number;
  counts: Record<Folder, number>;
  skillPath: string;
}): SyncSummary {
  return {
    boardId: options.boardId,
    sprintIds: options.sprintIds,
    issueCount: options.issueCount,
    counts: options.counts,
    skillPath: options.skillPath
  };
}

export function formatSyncSummaryHuman(summary: SyncSummary): string {
  const { boardId, sprintIds, issueCount, counts } = summary;
  const sprint =
    sprintIds.length > 0 ? sprintIds.join(", ") : "(no board filter)";
  const board = boardId ? `board ${boardId}, ` : "";
  const sprintTotal = counts.me + counts.team + counts.unassigned;
  const lines = [
    `Jira sync: ${board}sprint ${sprint}`,
    `Fetched ${issueCount} issue(s) from Jira`,
    `Board: ${sprintTotal} in sprint (me ${counts.me}, team ${counts.team}, unassigned ${counts.unassigned})` +
      (counts.misc > 0 ? `, ${counts.misc} in misc` : ""),
    `Skill: ${summary.skillPath}`
  ];
  return `${lines.join("\n")}\n`;
}

function printSyncSummary(
  summary: SyncSummary,
  options: CommandOptions = HUMAN_OUTPUT
): void {
  if (isJsonMode(options)) {
    printJsonSuccess(summary);
    return;
  }
  process.stdout.write(formatSyncSummaryHuman(summary));
}

function nonEmpty(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
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

function fetchBoardSprints(acli: string, boardId: string): BoardSprint[] {
  return listBoardSprints(boardId, acli);
}

/** Sync Jira -> jira-board SKILL.md; returns 0 on success. */
export async function run(options: CommandOptions = HUMAN_OUTPUT): Promise<number> {
  return (await runWithResult(options)).code;
}

let lastSyncError: string | undefined;

function syncFail(msg: string, options: CommandOptions = HUMAN_OUTPUT): number {
  process.stderr.write(`${LOG_PREFIX} ${msg}\n`);
  lastSyncError = msg;
  return failCommand(msg, options.outputMode);
}

/** Like `run()`, but includes the user-facing error message when `code !== 0`. */
export async function runWithResult(
  options: CommandOptions = HUMAN_OUTPUT
): Promise<SyncResult> {
  lastSyncError = undefined;
  try {
    const result = await runImpl(options);
    if (result.code !== 0) {
      return { code: result.code, error: lastSyncError ?? "Sync failed" };
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${LOG_PREFIX} ${msg}\n`);
    return { code: 1, error: msg };
  }
}

async function runImpl(options: CommandOptions): Promise<SyncResult> {
  const jql = nonEmpty(CONFIG.boardJql);
  const meAccountId = nonEmpty(CONFIG.meAccountId);
  let siteHost = nonEmpty(CONFIG.site);
  const boardId = nonEmpty(CONFIG.boardId);

  if (!jql) {
    return { code: syncFail("set CONFIG.boardJql.", options) };
  }
  if (!meAccountId) {
    return { code: syncFail("set CONFIG.meAccountId.", options) };
  }
  if (!siteHost) {
    return { code: syncFail("set CONFIG.site.", options) };
  }
  siteHost = normalizeSiteHost(siteHost);

  let effectiveJql = jql;
  let sprintIds: number[] = [];
  let retainedSprints: BoardSprint[] = [];
  if (boardId) {
    log(
      `board id ${boardId} — resolving sprints within 2d of start/end on this board…`
    );
    const boardSprints = fetchBoardSprints(ACLI, boardId);
    retainedSprints = sprintsInRetentionWindow(boardSprints);
    sprintIds = retainedSprints.map((s) => s.id);
    if (sprintIds.length === 0) {
      return {
        code: syncFail(
          `no sprints in retention window (±2 days of start/end) on board ${boardId}.`,
          options
        )
      };
    }
    log(`retained sprint id(s) on board: ${sprintIds.join(", ")}`);
    effectiveJql = scopeJqlToBoardSprints(effectiveJql, sprintIds);
  }

  log(`site ${siteHost}, skill ${JIRA_BOARD_SKILL_PATH}`);
  log(`JQL ${truncate(effectiveJql, 120)}`);
  log("fetching issues from Jira via acli…");
  if (!VERBOSE) {
    process.stderr.write(`${LOG_PREFIX} fetching from Jira...\n`);
  }

  const data = searchWorkitems({
    jql: effectiveJql,
    fields: JIRA_SEARCH_FIELDS,
    paginate: true,
    acli: ACLI
  });

  if (!Array.isArray(data)) {
    return { code: syncFail("expected JSON array from acli.", options) };
  }

  log(`received ${data.length} issue(s).`);

  const issues = data as Array<{
    key?: string;
    fields?: Record<string, unknown>;
  }>;

  const counts = countIssuesByFolder(issues, meAccountId);

  log(`writing jira-board skill → ${JIRA_BOARD_SKILL_PATH}`);
  writeJiraTicketsSkill(issues, JIRA_BOARD_SKILL_PATH, meAccountId);

  const project = configuredProject();
  let issueTypes: string[] = [];
  if (project) {
    try {
      issueTypes = parseProjectIssueTypeNames(listProjectIssueTypes(project, ACLI));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`issue types fetch failed: ${msg}`);
    }
  }

  writeBoardInfoCache({
    syncedAt: new Date().toISOString(),
    boardId,
    site: siteHost,
    project,
    effectiveJql,
    retainedSprints,
    counts,
    issueCount: issues.length,
    localTicketCount: countLocalTickets(),
    issueTypes
  });

  log("done.");
  const summary = buildSyncSummary({
    boardId,
    sprintIds,
    issueCount: issues.length,
    counts,
    skillPath: JIRA_BOARD_SKILL_PATH
  });
  printSyncSummary(summary, options);
  return { code: 0, summary };
}
