/**
 * `jira acli` -- direct alias to `acli jira <args...>` with unsafe commands blocked.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

import {
  blockedAcliJiraReason,
  buildAcliJiraArgs
} from "../lib/acli-policy.ts";
import { printError } from "../lib/output.ts";

/** Alias to `acli jira` with unsafe commands blocked for agents. */
export function runAcliPassthroughCommand(argv: string[]): number {
  const jiraArgs = buildAcliJiraArgs(argv);
  if (jiraArgs.length <= 1) {
    printError(
      "acli: missing subcommand (e.g. jira acli workitem view KEY --json)"
    );
    return 1;
  }

  const blocked = blockedAcliJiraReason(jiraArgs);
  if (blocked) {
    printError(`acli: ${blocked}`);
    return 1;
  }

  const result = spawnSync("acli", jiraArgs, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    const msg =
      result.error instanceof Error ? result.error.message : String(result.error);
    printError(`acli: ${msg}`);
    return 1;
  }

  return result.status ?? 1;
}
