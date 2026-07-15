/**
 * `jira acli` -- passthrough to `acli jira <args...>`.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

import { printError } from "../lib/output.ts";

/** Build `acli jira` argv from `jira acli` argv slice. */
export function buildAcliPassthroughArgs(argv: string[]): string[] {
  const args = argv.slice(3);
  if (args[0] === "jira") {
    return args;
  }
  return ["jira", ...args];
}

/** Run `jira acli <args...>`. */
export function runAcliPassthroughCommand(argv: string[]): number {
  const acliArgs = buildAcliPassthroughArgs(argv);
  if (acliArgs.length <= 1) {
    printError("acli: missing subcommand (e.g. jira acli workitem view KEY --json)");
    return 1;
  }

  const result = spawnSync("acli", acliArgs, {
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
