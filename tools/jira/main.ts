#!/usr/bin/env node
/**
 * Jira CLI -- pull tickets to local markdown under `jira/`.
 */
import process from "node:process";
import { runBoardCommand } from "./commands/board.ts";
import { printHelp } from "./commands/help.ts";
import { runPullCommand, runPullTicket } from "./commands/pull.ts";
import { runPushCommand } from "./commands/push.ts";
import { runSyncCommand } from "./commands/sync.ts";
import { parseJiraKey } from "./lib/jiraInput.ts";
import { printError } from "./lib/output.ts";

export async function main(argv: string[] = process.argv): Promise<void> {
  const arg = argv[2];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    return;
  }
  if (!arg) {
    printHelp();
    return;
  }
  if (arg === "sync") {
    process.exit(await runSyncCommand());
    return;
  }
  if (arg === "board") {
    process.exit(await runBoardCommand(argv));
    return;
  }
  if (arg === "pull") {
    process.exit(await runPullCommand(argv));
    return;
  }
  if (arg === "push") {
    process.exit(await runPushCommand(argv));
    return;
  }
  const key = parseJiraKey(arg);
  if (key) {
    process.exit(await runPullTicket(key));
    return;
  }
  printError(`unknown command or invalid ticket: ${arg}`);
  printHelp();
  process.exit(1);
}

main().catch((e) => {
  printError(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
