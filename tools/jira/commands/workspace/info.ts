/**
 * `jira info` -- print agent workspace context + my/unassigned board slice.
 */
import process from "node:process";

import { readBoardCache } from "../../lib/board-cache.ts";
import { formatJiraInfoPlainText, gatherJiraInfo } from "../../lib/info.ts";
import { formatBoardSummaryPlainText } from "./board-content.ts";

/** Run `jira info`. Always plain text (ignores global --json). */
export function runInfoCommand(baseDir?: string): number {
  const info = gatherJiraInfo();
  let out = formatJiraInfoPlainText(info);
  const board = readBoardCache(baseDir);
  if (board) {
    out += `\n${formatBoardSummaryPlainText(board)}`;
  } else {
    out += "\nboard: (run jira sync)\n";
  }
  process.stdout.write(out);
  return 0;
}
