/**
 * `jira edit` -- edit a Jira work item.
 */
import process from "node:process";

import { editWorkitem } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import { printError } from "../lib/output.ts";

/** Run `jira edit <KEY> [flags]`. */
export function runEditCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    printError("edit: missing Jira key");
    return 1;
  }

  const key = parseJiraKey(input) ?? input;
  const fromJson = flagString(parsed.flags, "from-json");
  const summary = flagString(parsed.flags, "summary");
  const descriptionFile = flagString(parsed.flags, "description-file");
  const labels = flagString(parsed.flags, "labels");
  const yes = flagBool(parsed.flags, "yes");

  if (!fromJson && !summary && !descriptionFile && !labels) {
    printError("edit: pass --summary, --description-file, --labels, or --from-json");
    return 1;
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
    process.stdout.write(`Edited ${key}\n`);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`edit ${key}: ${msg}`);
    return 1;
  }
}
