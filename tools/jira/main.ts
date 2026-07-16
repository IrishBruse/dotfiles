#!/usr/bin/env node
/**
 * Jira CLI -- pull tickets to local markdown under `jira/`.
 */
import process from "node:process";
import { runAcliPassthroughCommand } from "./commands/acli.ts";
import { runBatchCommand } from "./commands/batch.ts";
import { runBoardCommand } from "./commands/board.ts";
import { runCommentCommand } from "./commands/comment.ts";
import { runCreateCommand } from "./commands/create.ts";
import { runDoctorCommand } from "./commands/doctor.ts";
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
import { parseGlobalFlags, type CommandOptions } from "./lib/output-mode.ts";
import { failCommand } from "./lib/output.ts";

export async function main(argv: string[] = process.argv): Promise<void> {
  const { argv: cleaned, outputMode } = parseGlobalFlags(argv);
  const opts: CommandOptions = { outputMode };
  const arg = cleaned[2];
  if (arg === "-h" || arg === "--help" || !arg) {
    printHelp();
    return;
  }

  const subcommands: Record<string, () => number | Promise<number>> = {
    sync: () => runSyncCommand(opts),
    board: () => runBoardCommand(cleaned, opts),
    pull: () => runPullCommand(cleaned, { outputMode }),
    push: () => runPushCommand(cleaned, { outputMode }),
    show: () => runShowCommand(cleaned, opts),
    search: () => runSearchCommand(cleaned, opts),
    batch: () => runBatchCommand(cleaned, opts),
    doctor: () => runDoctorCommand(opts),
    acli: () => runAcliPassthroughCommand(cleaned),
    create: () => runCreateCommand(cleaned, opts),
    edit: () => runEditCommand(cleaned, opts),
    transition: () => runTransitionCommand(cleaned, opts),
    comment: () => runCommentCommand(cleaned, opts),
    link: () => runLinkCommand(cleaned, opts),
    info: () => runInfoCommand(opts),
    projects: () => runProjectsCommand(cleaned, opts),
    types: () => runTypesCommand(cleaned, opts)
  };

  const handler = subcommands[arg];
  if (handler) {
    process.exit(await handler());
    return;
  }

  const key = parseJiraKey(arg);
  if (key) {
    process.exit(await runPullTicket(key, { outputMode }));
    return;
  }

  failCommand(`unknown command or invalid ticket: ${arg}`, outputMode);
  if (outputMode === "human") {
    printHelp();
  }
  process.exit(1);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  failCommand(msg, "human");
  process.exit(1);
});
