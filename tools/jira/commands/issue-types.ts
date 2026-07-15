/**
 * `jira types` -- list issue types for a project.
 */
import process from "node:process";

import { listProjectIssueTypes } from "../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../lib/argv.ts";
import { printError } from "../lib/output.ts";

/** Run `jira types <PROJECT> [--format text]`. */
export function runTypesCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const project = parsed.positional[0];
  if (!project) {
    printError("types: missing project key");
    return 1;
  }

  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = listProjectIssueTypes(project);
    if (formatText) {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data)}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`types ${project}: ${msg}`);
    return 1;
  }
}
