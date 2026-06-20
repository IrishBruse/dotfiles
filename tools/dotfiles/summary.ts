import { homedir } from "node:os";

import { paint, stdoutColorEnabled } from "./paint.ts";
import type { StowAction, StowSummary } from "./types.ts";
import { formatPathTree } from "./tree.ts";

function printPaths(paths: string[], color: boolean): void {
  for (const path of paths) {
    console.log(`${paint(color, "dim", "    ")}${paint(color, "path", path)}`);
  }
}

function printPathTree(paths: string[], color: boolean): void {
  const paintLine = (prefix: string, name: string, role: "path" | "group"): string =>
    `${paint(color, "dim", prefix)}${paint(color, role === "path" ? "path" : "dim", name)}`;

  for (const line of formatPathTree(paths, paintLine)) {
    console.log(line);
  }
  console.log(
    paint(color, "dim", "    (dim: parent dirs only, not symlinked)")
  );
}

function printSection(
  icon: string,
  role: "ok" | "warn" | "bad",
  label: string,
  count: number,
  paths: string[],
  color: boolean
): void {
  process.stdout.write(`  ${paint(color, "label", icon)} `);
  process.stdout.write(paint(color, role, label));
  console.log(`  ${paint(color, "dim", String(count))}`);
  printPaths(paths, color);
}

export function printSummary(
  action: StowAction,
  target: string,
  summary: StowSummary,
  listUnchanged: boolean,
  elapsedMs: number,
  stowStatus: number
): number {
  const color = stdoutColorEnabled();
  const targetDisplay = target === homedir() ? "~" : target;

  process.stdout.write(`${paint(color, "label", action)} `);
  process.stdout.write(paint(color, "path", "home"));
  process.stdout.write(paint(color, "dim", " -> "));
  console.log(paint(color, "path", targetDisplay));
  console.log();

  if (summary.linked.length > 0) {
    printSection("+", "ok", "linked", summary.linked.length, summary.linked, color);
  }

  if (summary.removed.length > 0) {
    printSection(
      "-",
      "bad",
      "removed",
      summary.removed.length,
      summary.removed,
      color
    );
  }

  if (summary.unchanged.length > 0) {
    process.stdout.write(`  ${paint(color, "label", "~")} `);
    process.stdout.write(paint(color, "ok", "unchanged"));
    console.log(`  ${paint(color, "dim", String(summary.unchanged.length))}`);
    if (listUnchanged) {
      printPathTree(summary.unchanged, color);
    } else {
      console.log(paint(color, "dim", "    (use -v for tree)"));
    }
  }

  if (summary.warnings.length > 0) {
    printSection(
      "!",
      "warn",
      "note",
      summary.warnings.length,
      summary.warnings,
      color
    );
  }

  if (summary.conflicts.length > 0) {
    printSection(
      "x",
      "bad",
      "conflict",
      summary.conflicts.length,
      summary.conflicts,
      color
    );
  }

  const nothingToDo =
    summary.linked.length === 0 &&
    summary.removed.length === 0 &&
    summary.warnings.length === 0 &&
    summary.conflicts.length === 0 &&
    summary.unchanged.length > 0;

  if (nothingToDo) {
    console.log(paint(color, "dim", "  nothing to do"));
  }

  console.log();

  let exitCode = stowStatus;
  if (exitCode === 0 && summary.conflicts.length > 0) {
    exitCode = 1;
  }

  if (exitCode !== 0) {
    process.stdout.write(paint(color, "bad", "failed"));
  } else {
    process.stdout.write(paint(color, "ok", "done"));
  }
  console.log(paint(color, "dim", `  (${elapsedMs}ms)`));

  return exitCode;
}
