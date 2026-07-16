import process from "node:process";
import {
  paint,
  stderrColorEnabled,
  stdoutColorEnabled
} from "../../dotfiles/api.ts";

import type { ChildIssue } from "./types.ts";
import type { JiraResult, OutputMode } from "./output-mode.ts";

export function printJsonSuccess<T>(data: T): void {
  const envelope: JiraResult<T> = {
    success: true,
    data,
    error: null
  };
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

export function printJsonError(error: string, code?: string): void {
  const envelope: JiraResult<null> = {
    success: false,
    data: null,
    error,
    ...(code ? { code } : {})
  };
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
}

/** Print a failure message; JSON envelope on stdout when in json mode. */
export function failCommand(
  msg: string,
  mode: OutputMode,
  code?: string
): number {
  if (mode === "json") {
    printJsonError(msg, code);
  } else {
    printError(msg);
  }
  return 1;
}

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
