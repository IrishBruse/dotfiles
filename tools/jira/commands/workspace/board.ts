/**
 * `jira board` -- print cached board state from ~/.config/jira/board.json.
 */
import process from "node:process";

import { readBoardCache } from "../../lib/board-cache.ts";
import { formatBoardPlainText } from "./board-content.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

export type BoardCommandOptions = CommandOptions & {
  full?: boolean;
};

/** Run `jira board`. */
export function runBoardCommand(
  options: BoardCommandOptions = HUMAN_OUTPUT,
  baseDir?: string
): number {
  const cache = readBoardCache(baseDir);
  if (!cache) {
    return failCommand(
      "board cache not found (run jira sync)",
      options.outputMode
    );
  }

  if (isJsonMode(options)) {
    printJsonSuccess(cache);
    return 0;
  }

  process.stdout.write(formatBoardPlainText(cache, { full: options.full }));
  return 0;
}

/** Board cache for batch reads. */
export function gatherBoardCache(baseDir?: string) {
  return readBoardCache(baseDir);
}
