/**
 * `jira show` -- print one issue as JSON (no local file write).
 */
import process from "node:process";

import { viewWorkitem } from "../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../lib/argv.ts";
import { JIRA_PULL_FIELDS } from "../lib/format.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../lib/output.ts";

/** Run `jira show <KEY|URL> [--format text] [--fields ...]`. */
export function runShowCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("show: missing Jira key or URL", options.outputMode);
  }

  const key = parseJiraKey(input);
  if (!key) {
    return failCommand(
      `show: not a valid Jira key or URL: ${input}`,
      options.outputMode
    );
  }

  const fields =
    typeof parsed.flags.get("fields") === "string"
      ? String(parsed.flags.get("fields"))
      : JIRA_PULL_FIELDS;
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = viewWorkitem(key, { fields });
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
    return failCommand(`show ${key}: ${msg}`, options.outputMode);
  }
}
