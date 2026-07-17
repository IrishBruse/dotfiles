/**
 * Sync Jira workspace into ~/.config/jira/board.json via `acli jira workitem search`.
 */
import process from "node:process";

import {
  boardCachePath,
  writeBoardInfoCache
} from "../../lib/board-cache.ts";

import {
  listBoardSprints,
  listProjectIssueTypes,
  searchWorkitems,
  viewWorkitem,
  viewWorkitemAsync
} from "../../lib/acli-jira.ts";
import { createConcurrencyLimiter } from "../../../.lib/concurrency.ts";
import { writeBoardContentFromIssues } from "./board-content.ts";
import { sprintsInRetentionWindow } from "./write.ts";
import { CONFIG, configuredProject } from "../../lib/CONFIG.ts";
import {
  assigneeRecord,
  classifyFolder,
  JIRA_SEARCH_FIELDS,
  jiraBoardViewExtraFields,
  jiraViewExtraFields,
  normalizeSiteHost
} from "../../lib/format.ts";
import {
  featureTeamOptionFromIssues,
  meDisplayNameFromIssues,
  parseFeatureTeamFromBoardJql,
  parseProjectIssueTypeDetails,
  parseProjectIssueTypeNames,
  parseProjectName,
  statusNamesFromIssues
} from "../../lib/info.ts";
import { countLocalTickets } from "../../lib/local.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";
import type { BoardSprint, Folder, SyncResult, SyncSummary } from "../../lib/types.ts";
import type { CachedIssueType } from "../../lib/board-cache.ts";

const BOARD_CACHE_PATH = boardCachePath();

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

/** One workitem view when search rows lack Feature Team option ids. */
function resolveFeatureTeamOptionId(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  fieldId: string,
  preferredName: string
): string {
  const sample = issues.find((issue) => typeof issue.key === "string" && issue.key);
  if (!sample?.key) return "";
  try {
    const data = viewWorkitem(sample.key, {
      fields: fieldId || jiraViewExtraFields(),
      acli: ACLI
    });
    const fields = workitemViewFields(data);
    const option = featureTeamOptionFromIssues(
      [{ fields }],
      fieldId,
      preferredName
    );
    return option?.id ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`feature team option lookup failed: ${msg}`);
    return "";
  }
}

/** Build structured sync summary. */
export function buildSyncSummary(options: {
  boardId: string | null;
  sprintIds: number[];
  issueCount: number;
  counts: Record<Folder, number>;
  boardPath: string;
}): SyncSummary {
  return {
    boardId: options.boardId,
    sprintIds: options.sprintIds,
    issueCount: options.issueCount,
    counts: options.counts,
    boardPath: options.boardPath
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
    `Cache: ${summary.boardPath}`
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

/** Sync Jira -> board.json; returns 0 on success. */
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
    return { code: syncFail("set boardJql in ~/.config/jira/config.json.", options) };
  }
  if (!meAccountId) {
    return { code: syncFail("set meAccountId in ~/.config/jira/config.json.", options) };
  }
  if (!siteHost) {
    return { code: syncFail("set site in ~/.config/jira/config.json.", options) };
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

  log(`site ${siteHost}, cache ${BOARD_CACHE_PATH}`);
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

  if (issues.length > 0) {
    log(`enriching ${issues.length} issue(s) with status age fields…`);
    await enrichIssuesWithViewFieldsAsync(
      issues,
      jiraBoardViewExtraFields(),
      ACLI
    );
  }

  const counts = countIssuesByFolder(issues, meAccountId);

  const syncedAt = new Date().toISOString();

  log(`writing board cache -> ${BOARD_CACHE_PATH}`);
  writeBoardContentFromIssues(issues, meAccountId, syncedAt);

  const project = configuredProject();
  let issueTypes: string[] = [];
  let issueTypeDetails: CachedIssueType[] = [];
  let projectName = "";
  if (project) {
    try {
      const projectView = listProjectIssueTypes(project, ACLI);
      issueTypeDetails = parseProjectIssueTypeDetails(projectView);
      issueTypes = parseProjectIssueTypeNames(projectView);
      projectName = parseProjectName(projectView);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`issue types fetch failed: ${msg}`);
    }
  }

  const featureTeamField = CONFIG.featureTeamField.trim();
  const featureTeamName =
    CONFIG.featureTeam.trim() ||
    parseFeatureTeamFromBoardJql(jql);
  let featureTeamOptionId = CONFIG.featureTeamOptionId.trim();
  if (featureTeamField && !featureTeamOptionId) {
    const fromIssues = featureTeamOptionFromIssues(
      issues,
      featureTeamField,
      featureTeamName
    );
    if (fromIssues) {
      featureTeamOptionId = fromIssues.id;
    } else {
      featureTeamOptionId = resolveFeatureTeamOptionId(
        issues,
        featureTeamField,
        featureTeamName
      );
    }
  }

  const meDisplayName =
    CONFIG.meDisplayName.trim() ||
    meDisplayNameFromIssues(issues, meAccountId);

  writeBoardInfoCache({
    syncedAt,
    boardId,
    site: siteHost,
    project,
    projectName,
    effectiveJql,
    retainedSprints,
    counts,
    issueCount: issues.length,
    localTicketCount: countLocalTickets(),
    issueTypes,
    issueTypeDetails,
    statuses: statusNamesFromIssues(issues),
    featureTeamName,
    featureTeamOptionId,
    meDisplayName
  });

  log("done.");
  const summary = buildSyncSummary({
    boardId,
    sprintIds,
    issueCount: issues.length,
    counts,
    boardPath: BOARD_CACHE_PATH
  });
  printSyncSummary(summary, options);
  return { code: 0, summary };
}

/** Entry point for `jira sync`. */
export const runSyncCommand = run;

/** Structured result for `jira sync`. */
export const runSyncWithResult = runWithResult;
