/**
 * `jira edit` -- edit a Jira work item.
 */
import process from "node:process";

import { editWorkitem } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../lib/output.ts";

/** Run `jira edit <KEY> [flags]`. */
export function runEditCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("edit: missing Jira key", options.outputMode);
  }

  const key = parseJiraKey(input) ?? input;
  const fromJson = flagString(parsed.flags, "from-json");
  const summary = flagString(parsed.flags, "summary");
  const descriptionFile = flagString(parsed.flags, "description-file");
  const labels = flagString(parsed.flags, "labels");
  const yes = flagBool(parsed.flags, "yes");

  if (!fromJson && !summary && !descriptionFile && !labels) {
    return failCommand(
      "edit: pass --summary, --description-file, --labels, or --from-json",
      options.outputMode
    );
  }

  try {
    editWorkitem({
      key,
      fromJson: fromJson || undefined,
      summary: summary || undefined,
      descriptionFile: descriptionFile || undefined,
      labels: labels || undefined,
      yes
    });
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "edit" });
    } else {
      process.stdout.write(`Edited ${key}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`edit ${key}: ${msg}`, options.outputMode);
  }
}
