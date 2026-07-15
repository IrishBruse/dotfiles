/**
 * `jira show` -- print one issue as JSON (no local file write).
 */
import process from "node:process";

import { viewWorkitem } from "../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../lib/argv.ts";
import { JIRA_PULL_FIELDS } from "../lib/format.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import { printError } from "../lib/output.ts";

/** Run `jira show <KEY|URL> [--json] [--format text] [--fields ...]`. */
export function runShowCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    printError("show: missing Jira key or URL");
    return 1;
  }

  const key = parseJiraKey(input);
  if (!key) {
    printError(`show: not a valid Jira key or URL: ${input}`);
    return 1;
  }

  const fields =
    typeof parsed.flags.get("fields") === "string"
      ? String(parsed.flags.get("fields"))
      : JIRA_PULL_FIELDS;
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = viewWorkitem(key, { fields });
    if (formatText) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data)}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`show ${key}: ${msg}`);
    return 1;
  }
}
