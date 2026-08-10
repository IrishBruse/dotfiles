/**
 * `jira info` -- print agent workspace context + my/unassigned board slice.
 */
import { homedir } from "node:os";
import process from "node:process";

import { formatJiraInfoPlainText, gatherJiraInfoJson } from "../../lib/info.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { printJsonSuccess } from "../../lib/output.ts";
import { formatBoardSummaryPlainText } from "./board-content.ts";

/** Run `jira info` (plain text) or `jira info --json` (JiraInfo + board cache). */
export function runInfoCommand(
  options: CommandOptions = HUMAN_OUTPUT,
  baseDir = homedir()
): number {
  const payload = gatherJiraInfoJson(baseDir);
  if (isJsonMode(options)) {
    printJsonSuccess(payload);
    return 0;
  }

  const { board, ...info } = payload;
  let out = formatJiraInfoPlainText(info);
  if (board) {
    out += `\n${formatBoardSummaryPlainText(board)}`;
  } else {
    out += "\nboard: (run jira sync)\n";
  }
  process.stdout.write(out);
  return 0;
}
