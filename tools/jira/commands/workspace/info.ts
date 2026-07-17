/**
 * `jira info` -- print agent workspace context.
 */
import process from "node:process";

import { formatJiraInfoPlainText, gatherJiraInfo } from "../../lib/info.ts";

/** Run `jira info`. Always plain text (ignores global --json). */
export function runInfoCommand(): number {
  const info = gatherJiraInfo();
  process.stdout.write(formatJiraInfoPlainText(info));
  return 0;
}
