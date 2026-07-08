import process from "node:process";
import {
  paint,
  stderrColorEnabled,
  stdoutColorEnabled
} from "../../dotfiles/api.ts";

import type { ChildIssue } from "./types.ts";

export function printError(msg: string): void {
  const c = stderrColorEnabled();
  process.stderr.write(`${paint(c, "bad", "error")}: ${msg}\n`);
}

export function printPulled(key: string, title: string): void {
  const c = stdoutColorEnabled();
  process.stdout.write(`${paint(c, "label", key)}  ${title}\n`);
}

export function printChildIssues(children: ChildIssue[]): void {
  if (children.length === 0) return;
  const c = stdoutColorEnabled();
  process.stdout.write(
    `\n${paint(c, "dim", `${children.length} child issue(s):`)}\n`
  );
  for (const child of children) {
    const type = paint(c, "dim", child.issueType);
    process.stdout.write(
      `  ${paint(c, "label", child.key)}  ${type}  ${child.summary}\n`
    );
  }
}

export function printPullSummary(total: number): void {
  const c = stdoutColorEnabled();
  const noun = total === 1 ? "issue" : "issues";
  process.stdout.write(`\n${paint(c, "ok", `Pulled ${total} ${noun}.`)}\n`);
}

/** Progress and status on stderr so stdout stays pipe-friendly. */
export function pullLog(msg: string): void {
  const c = stderrColorEnabled();
  process.stderr.write(`${paint(c, "dim", "jira:")} ${msg}\n`);
}
