/**
 * `jira transition` -- transition a Jira work item.
 */
import process from "node:process";

import { transitionWorkitem } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../lib/output.ts";

/** Run `jira transition <KEY> --status "..."`. */
export function runTransitionCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("transition: missing Jira key", options.outputMode);
  }

  const key = parseJiraKey(input) ?? input;
  const status = flagString(parsed.flags, "status");
  if (!status) {
    return failCommand("transition: --status is required", options.outputMode);
  }

  const yes = flagBool(parsed.flags, "yes");

  try {
    transitionWorkitem({ key, status, yes });
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "transition", status });
    } else {
      process.stdout.write(`Transitioned ${key} to ${status}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`transition ${key}: ${msg}`, options.outputMode);
  }
}
