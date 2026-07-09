#!/usr/bin/env node
/**
 * Confluence CLI -- pull pages to local markdown and push edits back.
 */
import process from "node:process";

import { printHelp } from "./commands/help.ts";
import { runPullCommand, runPullPage } from "./commands/pull.ts";
import { runPushCommand } from "./commands/push.ts";
import { runStatusCommand, runVerifyCommand } from "./commands/status.ts";
import { runSyncCommand } from "./commands/sync.ts";
import { parsePageId } from "./lib/pageInput.ts";
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
  if (arg === "pull") {
    process.exit(await runPullCommand(argv));
    return;
  }
  if (arg === "push") {
    process.exit(await runPushCommand(argv));
    return;
  }
  if (arg === "sync") {
    process.exit(await runSyncCommand(argv));
    return;
  }
  if (arg === "status") {
    process.exit(await runStatusCommand());
    return;
  }
  if (arg === "verify") {
    process.exit(runVerifyCommand());
    return;
  }
  const pageId = parsePageId(arg);
  if (pageId) {
    process.exit(await runPullPage(arg));
    return;
  }
  printError(`unknown command or invalid page: ${arg}`);
  printHelp();
  process.exit(1);
}

main().catch((e) => {
  printError(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
