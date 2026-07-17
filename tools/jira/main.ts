#!/usr/bin/env node
/**
 * Jira CLI -- pull tickets to local markdown under `jira/`.
 */
import process from "node:process";
import { runAcliPassthroughCommand } from "./commands/other/acli.ts";
import { runBatchCommand } from "./commands/workspace/batch.ts";
import { runDoctorCommand } from "./commands/workspace/doctor.ts";
import { runInfoCommand } from "./commands/workspace/info.ts";
import { runBoardCommand } from "./commands/workspace/board.ts";
import { runSyncCommand } from "./commands/workspace/sync.ts";
import { runPullCommand, runPullTicket } from "./commands/local/pull.ts";
import { runPushCommand } from "./commands/local/push.ts";
import { runProjectsCommand } from "./commands/read/projects.ts";
import { runSearchCommand } from "./commands/read/search.ts";
import { runShowCommand } from "./commands/read/show.ts";
import { runTypesCommand } from "./commands/read/types.ts";
import { runCommentCommand } from "./commands/write/comment.ts";
import { runCreateCommand } from "./commands/write/create.ts";
import { runEditCommand } from "./commands/write/edit.ts";
import { runLinkCommand } from "./commands/write/link.ts";
import { runTransitionCommand } from "./commands/write/transition.ts";
import { printHelp } from "./commands/help.ts";
import { parseJiraKey } from "./lib/jiraInput.ts";
import { parseSubcommandArgv, flagBool } from "./lib/argv.ts";
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

  if (arg === "board") {
    const { flags } = parseSubcommandArgv(cleaned, 3);
    process.exit(runBoardCommand({ ...opts, full: flagBool(flags, "full") }));
    return;
  }

  const subcommands: Record<string, () => number | Promise<number>> = {
    sync: () => runSyncCommand(opts),
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
    info: () => runInfoCommand(),
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
