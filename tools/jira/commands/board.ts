import { run as runBoardSync } from "./board/sync.ts";
import { printError } from "../output.ts";

/** Run `jira board <subcommand>`. */
export async function runBoardCommand(argv: string[]): Promise<number> {
  const sub = argv[3];
  if (sub === "sync") {
    return runBoardSync();
  }
  printError("board: unknown subcommand (try: sync)");
  return 1;
}
