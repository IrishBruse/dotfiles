/**
 * `jira comment` -- add a comment to a Jira work item.
 */
import process from "node:process";

import { createComment } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import { printError } from "../lib/output.ts";

/** Run `jira comment <KEY> --body-file <path>`. */
export function runCommentCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    printError("comment: missing Jira key");
    return 1;
  }

  const key = parseJiraKey(input) ?? input;
  const bodyFile = flagString(parsed.flags, "body-file");
  const body = flagString(parsed.flags, "body");
  const yes = flagBool(parsed.flags, "yes");

  if (!bodyFile && !body) {
    printError("comment: --body-file or --body is required");
    return 1;
  }

  try {
    createComment({
      key,
      bodyFile: bodyFile || undefined,
      body: body || undefined,
      yes
    });
    process.stdout.write(`Commented on ${key}\n`);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`comment ${key}: ${msg}`);
    return 1;
  }
}
