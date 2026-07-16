/**
 * `jira types` -- list issue types for a project.
 */
import process from "node:process";

import { listProjectIssueTypes } from "../../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Run `jira types [--format text]`. */
export function runTypesCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const project = configuredProject();
  if (!project) {
    return failCommand(
      "types: set CONFIG.project in tools/jira/lib/CONFIG.ts (or use jira acli)",
      options.outputMode
    );
  }

  const formatText = parsed.flags.get("format") === "text";

  try {
    const data = listProjectIssueTypes(project);
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
    return failCommand(`types ${project}: ${msg}`, options.outputMode);
  }
}
