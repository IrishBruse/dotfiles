/**
 * `jira search` -- JQL search with JSON output.
 */
import process from "node:process";

import { searchWorkitems } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { JIRA_SEARCH_FIELDS } from "../lib/format.ts";
import { printError } from "../lib/output.ts";

/** Run `jira search --jql "..." [--fields ...] [--json] [--format text]`. */
export function runSearchCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const jql = flagString(parsed.flags, "jql");
  if (!jql) {
    printError("search: --jql is required");
    return 1;
  }

  const fields = flagString(parsed.flags, "fields", JIRA_SEARCH_FIELDS);
  const paginate = !flagBool(parsed.flags, "no-paginate");
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = searchWorkitems({ jql, fields, paginate });
    if (formatText) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data)}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`search: ${msg}`);
    return 1;
  }
}
