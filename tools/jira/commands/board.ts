import { runSyncCommand } from "./sync.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT } from "../lib/output-mode.ts";
import { failCommand } from "../lib/output.ts";

/** Run `jira board <subcommand>` (deprecated; use `jira sync`). */
export async function runBoardCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): Promise<number> {
  const sub = argv[3];
  if (sub === "sync") {
    process.stderr.write("board sync is deprecated, use: jira sync\n");
    return runSyncCommand(options);
  }
  return failCommand("board: unknown subcommand (use: jira sync)", options.outputMode);
}
