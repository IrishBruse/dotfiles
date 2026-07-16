/**
 * `jira comment` -- add a comment to a Jira work item.
 */
import process from "node:process";

import { createComment } from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Run `jira comment <KEY> --body-file <path>`. */
export function runCommentCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("comment: missing Jira key", options.outputMode);
  }

  const key = parseJiraKey(input) ?? input;
  const bodyFile = flagString(parsed.flags, "body-file");
  const body = flagString(parsed.flags, "body");
  const yes = flagBool(parsed.flags, "yes");

  if (!bodyFile && !body) {
    return failCommand(
      "comment: --body-file or --body is required",
      options.outputMode
    );
  }

  try {
    createComment({
      key,
      bodyFile: bodyFile || undefined,
      body: body || undefined,
      yes
    });
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "comment" });
    } else {
      process.stdout.write(`Commented on ${key}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`comment ${key}: ${msg}`, options.outputMode);
  }
}
