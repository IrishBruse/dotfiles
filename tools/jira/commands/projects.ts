/**
 * `jira projects` -- list visible Jira projects.
 */
import process from "node:process";

import { listProjects } from "../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../lib/argv.ts";
import { printError } from "../lib/output.ts";

/** Run `jira projects [--format text]`. */
export function runProjectsCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = listProjects();
    if (formatText) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data)}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`projects: ${msg}`);
    return 1;
  }
}
