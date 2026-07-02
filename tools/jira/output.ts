import process from "node:process";
import {
  paint,
  stderrColorEnabled,
  stdoutColorEnabled
} from "../dotfiles/paint.ts";

import type { ChildIssue } from "./children.ts";

export function printError(msg: string): void {
  const c = stderrColorEnabled();
  process.stderr.write(`${paint(c, "bad", "error")}: ${msg}\n`);
}

export function printPulled(key: string, title: string, relPath: string): void {
  const c = stdoutColorEnabled();
  process.stdout.write(
    `${paint(c, "label", key)}  ${title}\n${paint(c, "dim", "  → ")}${relPath}\n`
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
    process.stdout.write(`  ${paint(c, "label", child.key)}  ${type}  ${child.summary}\n`);
  }
}

export function printPullSummary(total: number): void {
  const c = stdoutColorEnabled();
  const noun = total === 1 ? "issue" : "issues";
  process.stdout.write(`\n${paint(c, "ok", `Pulled ${total} ${noun}.`)}\n`);
}
