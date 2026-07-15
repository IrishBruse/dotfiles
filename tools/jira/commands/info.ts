/**
 * `jira info` -- print workspace context as plain text.
 */
import process from "node:process";

import { formatJiraInfoPlainText, gatherJiraInfo } from "../lib/info.ts";

/** Run `jira info`. */
export function runInfoCommand(): number {
  const info = gatherJiraInfo();
  process.stdout.write(formatJiraInfoPlainText(info));
  return 0;
}
