/**
 * `jira search` -- JQL search with compact agent-friendly output.
 *
 * Progressive disclosure: list key/summary/type/status/assignee here.
 * Use `jira show KEY` for full ticket markdown (description, AC, etc.).
 */
import process from "node:process";

import { searchWorkitems } from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import {
  assigneeLabel,
  assigneeRecord,
  issueTypeName,
  JIRA_SEARCH_DEFAULT_LIMIT,
  JIRA_SEARCH_LIST_FIELDS,
  statusNameFromFields
} from "../../lib/format.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** True when the input already looks like JQL (operators present). */
export function looksLikeJql(query: string): boolean {
  return /(=|!=|!~|~|>=|<=|>|<|\bIN\b|\bIS\b|\bAND\b|\bOR\b|\bNOT\b|\bORDER\s+BY\b)/i.test(
    query
  );
}

/**
 * Turn bare words into project-scoped text search JQL.
 * `design governance` → `project = NOVACORE AND text ~ "\"design governance\""`
 */
export function freeTextToJql(query: string, project = configuredProject()): string {
  const escaped = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `project = ${project} AND text ~ "\\"${escaped}\\""`;
}

/** Normalize search input: keep real JQL, rewrite free text. */
export function normalizeSearchJql(query: string): {
  jql: string;
  rewritten: boolean;
} {
  if (looksLikeJql(query)) {
    return { jql: query, rewritten: false };
  }
  return { jql: freeTextToJql(query), rewritten: true };
}

/** One compact search hit for agents (no ADF description). */
export type SearchHit = {
  key: string;
  summary: string;
  type: string;
  status: string;
  assignee: string;
};

/** Compact search payload returned by default and `--json`. */
export type SearchResult = {
  jql: string;
  count: number;
  limit: number | null;
  issues: SearchHit[];
  hint: string;
};

const SEARCH_HINT = "Use jira show KEY for full ticket markdown";

function issueFields(issue: unknown): Record<string, unknown> {
  if (!issue || typeof issue !== "object") return {};
  const fields = (issue as { fields?: unknown }).fields;
  return fields && typeof fields === "object" && !Array.isArray(fields)
    ? (fields as Record<string, unknown>)
    : {};
}

/** Flatten raw acli search rows into compact hits. */
export function compactSearchHits(data: unknown): SearchHit[] {
  if (!Array.isArray(data)) return [];
  const hits: SearchHit[] = [];
  for (const issue of data) {
    if (!issue || typeof issue !== "object") continue;
    const key = (issue as { key?: unknown }).key;
    if (typeof key !== "string" || !key) continue;
    const fields = issueFields(issue);
    const summary =
      typeof fields.summary === "string" ? fields.summary.trim() : key;
    hits.push({
      key,
      summary,
      type: issueTypeName(fields),
      status: statusNameFromFields(fields) || "Unknown",
      assignee: assigneeLabel(assigneeRecord(fields.assignee))
    });
  }
  return hits;
}

/** Build the compact search result envelope. */
export function buildSearchResult(options: {
  jql: string;
  data: unknown;
  limit: number | null;
}): SearchResult {
  const issues = compactSearchHits(options.data);
  return {
    jql: options.jql,
    count: issues.length,
    limit: options.limit,
    issues,
    hint: SEARCH_HINT
  };
}

/** Human one-line listing for progressive disclosure. */
export function formatSearchPlainText(result: SearchResult): string {
  if (result.count === 0) {
    return `0 issue(s) for: ${result.jql}\n`;
  }
  const lines = result.issues.map(
    (hit) =>
      `${hit.key}\t${hit.type}\t${hit.status}\t${hit.assignee}\t${hit.summary}`
  );
  lines.push(`${result.count} issue(s). ${result.hint}.`);
  return `${lines.join("\n")}\n`;
}

function resolveSearchLimit(flags: Map<string, string | boolean>): {
  limit: number | null;
  paginate: boolean;
} {
  const paginate = flagBool(flags, "paginate");
  if (paginate) {
    return { limit: null, paginate: true };
  }
  const raw = flagString(flags, "limit");
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("search: --limit must be a positive integer");
    }
    return { limit: n, paginate: false };
  }
  // Default: bounded list. --no-paginate alone still uses the default limit.
  return { limit: JIRA_SEARCH_DEFAULT_LIMIT, paginate: false };
}

/** Run `jira search "<jql>" [--limit N] [--fields ...] [--raw] [--paginate]`. */
export function runSearchCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const raw = parsed.positional[0]?.trim() ?? "";
  if (!raw) {
    return failCommand(
      'search: missing JQL query (example: project = NOVACORE AND summary ~ "governance")',
      options.outputMode
    );
  }

  const { jql, rewritten } = normalizeSearchJql(raw);
  if (rewritten && !isJsonMode(options)) {
    process.stderr.write(
      `note: free-text search rewritten to JQL: ${jql}\n`
    );
  }

  const fields = flagString(parsed.flags, "fields", JIRA_SEARCH_LIST_FIELDS);
  const rawOutput = flagBool(parsed.flags, "raw");
  let limit: number | null;
  let paginate: boolean;
  try {
    ({ limit, paginate } = resolveSearchLimit(parsed.flags));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(msg, options.outputMode);
  }

  try {
    const data = searchWorkitems({
      jql,
      fields,
      paginate,
      limit: limit ?? undefined
    });
    if (rawOutput) {
      if (isJsonMode(options)) {
        printJsonSuccess(data);
      } else {
        process.stdout.write(`${JSON.stringify(data)}\n`);
      }
      return 0;
    }

    const result = buildSearchResult({ jql, data, limit });
    if (isJsonMode(options)) {
      printJsonSuccess(result);
      return 0;
    }
    process.stdout.write(formatSearchPlainText(result));
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`search: ${msg}`, options.outputMode);
  }
}
