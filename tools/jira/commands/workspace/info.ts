/**
 * `jira info` -- print agent workspace context + my/unassigned board slice.
 *
 * Prefer plain output. Use `--json` only when structured fields are required.
 * JSON progressive disclosure:
 * - `jira info --json` → slim fields (no board sections)
 * - `jira info --json --board` → include full board cache
 */
import { homedir } from "node:os";
import process from "node:process";

import { flagBool, parseSubcommandArgv } from "../../lib/argv.ts";
import { readBoardCache } from "../../lib/board-cache.ts";
import { formatJiraInfoPlainText, gatherJiraInfoJson } from "../../lib/info.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { printJsonSuccess } from "../../lib/output.ts";
import { formatBoardSummaryPlainText } from "./board-content.ts";

export type InfoCommandOptions = CommandOptions & {
  /** Include full board cache in JSON output. */
  includeBoard?: boolean;
  argv?: string[];
};

/** Resolve whether board should be included from argv flags. */
export function infoIncludesBoard(argv: string[] = []): boolean {
  const parsed = parseSubcommandArgv(argv, 3);
  return flagBool(parsed.flags, "board");
}

/** Run `jira info` (plain text) or `jira info --json` (slim JiraInfo). */
export function runInfoCommand(
  options: InfoCommandOptions = HUMAN_OUTPUT,
  baseDir = homedir()
): number {
  const includeBoard =
    options.includeBoard === true ||
    (options.argv ? infoIncludesBoard(options.argv) : false);

  if (isJsonMode(options)) {
    printJsonSuccess(gatherJiraInfoJson(baseDir, { includeBoard }));
    return 0;
  }

  const info = gatherJiraInfoJson(baseDir, { includeBoard: false });
  const { hint: _hint, ...fields } = info;
  let out = formatJiraInfoPlainText(fields);
  const boardCache = readBoardCache(baseDir);
  if (boardCache) {
    out += `\n${formatBoardSummaryPlainText(boardCache)}`;
  } else {
    out += "\nboard: (run jira sync)\n";
  }
  process.stdout.write(out);
  return 0;
}
