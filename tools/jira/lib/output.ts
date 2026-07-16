import process from "node:process";
import {
  paint,
  stderrColorEnabled,
  stdoutColorEnabled
} from "../../dotfiles/api.ts";

import type { ChildIssue, PullChangeStatus } from "./types.ts";
import type { JiraResult, OutputMode } from "./output-mode.ts";
import type { PaintRole } from "../../dotfiles/api.ts";

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

const PULL_STATUS_MARK: Record<
  PullChangeStatus,
  { mark: string; role: PaintRole }
> = {
  added: { mark: "+", role: "ok" },
  updated: { mark: "~", role: "warn" },
  moved: { mark: ">", role: "label" },
  deleted: { mark: "-", role: "bad" },
  unchanged: { mark: " ", role: "dim" }
};

/** Git-style change marker for `jira pull` output. */
export function pullChangeMark(status: PullChangeStatus): string {
  const { mark } = PULL_STATUS_MARK[status];
  return status === "unchanged" ? "  " : `${mark} `;
}

export function printPulled(
  key: string,
  title: string,
  status: PullChangeStatus = "added"
): void {
  const c = stdoutColorEnabled();
  const { role } = PULL_STATUS_MARK[status];
  const indicator = pullChangeMark(status);
  process.stdout.write(
    `${paint(c, role, indicator)}${paint(c, "label", key)}  ${title}\n`
  );
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

/** Progress and status on stderr so stdout stays pipe-friendly. */
export function pullLog(msg: string): void {
  const c = stderrColorEnabled();
  process.stderr.write(`${paint(c, "dim", "jira:")} ${msg}\n`);
}
