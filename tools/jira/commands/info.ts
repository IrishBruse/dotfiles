/**
 * `jira info` -- print workspace context as plain text or JSON.
 */
import process from "node:process";

import { formatJiraInfoPlainText, gatherJiraInfo } from "../lib/info.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { printJsonSuccess } from "../lib/output.ts";

/** Run `jira info`. */
export function runInfoCommand(options: CommandOptions = HUMAN_OUTPUT): number {
  const info = gatherJiraInfo();
  if (isJsonMode(options)) {
    printJsonSuccess(info);
    return 0;
  }
  process.stdout.write(formatJiraInfoPlainText(info));
  return 0;
}
