/**
 * `jira search` -- JQL search with JSON output.
 */
import process from "node:process";

import { searchWorkitems } from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import { JIRA_SEARCH_FIELDS } from "../../lib/format.ts";
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

/** Run `jira search "<jql>" [--fields ...] [--format text]`. */
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

  const fields = flagString(parsed.flags, "fields", JIRA_SEARCH_FIELDS);
  const paginate = !flagBool(parsed.flags, "no-paginate");
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = searchWorkitems({ jql, fields, paginate });
    if (isJsonMode(options)) {
      printJsonSuccess(data);
      return 0;
    }
    if (formatText) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data)}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`search: ${msg}`, options.outputMode);
  }
}
