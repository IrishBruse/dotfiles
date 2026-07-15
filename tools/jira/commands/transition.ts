/**
 * `jira transition` -- transition a Jira work item.
 */
import process from "node:process";

import { transitionWorkitem } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import { printError } from "../lib/output.ts";

/** Run `jira transition <KEY> --status "..."`. */
export function runTransitionCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    printError("transition: missing Jira key");
    return 1;
  }

  const key = parseJiraKey(input) ?? input;
  const status = flagString(parsed.flags, "status");
  if (!status) {
    printError("transition: --status is required");
    return 1;
  }

  const yes = flagBool(parsed.flags, "yes");

  try {
    transitionWorkitem({ key, status, yes });
    process.stdout.write(`Transitioned ${key} to ${status}\n`);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`transition ${key}: ${msg}`);
    return 1;
  }
}
