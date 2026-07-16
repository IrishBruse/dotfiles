/**
 * `jira projects` -- list visible Jira projects.
 */
import process from "node:process";

import { listProjects } from "../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../lib/argv.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../lib/output.ts";

/** Run `jira projects [--format text]`. */
export function runProjectsCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = listProjects();
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
    return failCommand(`projects: ${msg}`, options.outputMode);
  }
}
