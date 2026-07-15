#!/usr/bin/env node
/**
 * Jira CLI -- pull tickets to local markdown under `jira/`.
 */
import process from "node:process";
import { runAcliPassthroughCommand } from "./commands/acli.ts";
import { runBoardCommand } from "./commands/board.ts";
import { runCommentCommand } from "./commands/comment.ts";
import { runCreateCommand } from "./commands/create.ts";
import { runEditCommand } from "./commands/edit.ts";
import { printHelp } from "./commands/help.ts";
import { runInfoCommand } from "./commands/info.ts";
import { runTypesCommand } from "./commands/issue-types.ts";
import { runLinkCommand } from "./commands/link.ts";
import { runProjectsCommand } from "./commands/projects.ts";
import { runPullCommand, runPullTicket } from "./commands/pull.ts";
import { runPushCommand } from "./commands/push.ts";
import { runSearchCommand } from "./commands/search.ts";
import { runShowCommand } from "./commands/show.ts";
import { runSyncCommand } from "./commands/sync.ts";
import { runTransitionCommand } from "./commands/transition.ts";
import { parseJiraKey } from "./lib/jiraInput.ts";
import { printError } from "./lib/output.ts";

export async function main(argv: string[] = process.argv): Promise<void> {
  const arg = argv[2];
  if (arg === "-h" || arg === "--help" || !arg) {
    printHelp();
    return;
  }

  const subcommands: Record<string, () => number | Promise<number>> = {
    sync: () => runSyncCommand(),
    board: () => runBoardCommand(argv),
    pull: () => runPullCommand(argv),
    push: () => runPushCommand(argv),
    show: () => runShowCommand(argv),
    search: () => runSearchCommand(argv),
    acli: () => runAcliPassthroughCommand(argv),
    create: () => runCreateCommand(argv),
    edit: () => runEditCommand(argv),
    transition: () => runTransitionCommand(argv),
    comment: () => runCommentCommand(argv),
    link: () => runLinkCommand(argv),
    info: () => runInfoCommand(),
    projects: () => runProjectsCommand(argv),
    types: () => runTypesCommand(argv)
  };

  const handler = subcommands[arg];
  if (handler) {
    process.exit(await handler());
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
