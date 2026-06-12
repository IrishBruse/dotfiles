import process from "node:process";

import type { PrSplitSlice, StagedFile } from "./types.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";

export function stderrColorEnabled(): boolean {
  return process.stderr.isTTY === true;
}

export function stdoutColorEnabled(): boolean {
  return process.stdout.isTTY === true;
}

export function formatCommitSubject(message: string, color: boolean): string {
  const scoped = message.match(/^([^:(]+)\(([^)]+)\): (.*)$/);
  if (scoped) {
    return [
      paint(color, `${BOLD}${CYAN}`, scoped[1]!),
      paint(color, DIM, "("),
      paint(color, YELLOW, scoped[2]!),
      paint(color, DIM, "): "),
      scoped[3]!
    ].join("");
  }

  const plain = message.match(/^([^:]+): (.*)$/);
  if (plain) {
    return [
      paint(color, `${BOLD}${CYAN}`, plain[1]!),
      paint(color, DIM, ": "),
      plain[2]!
    ].join("");
  }

  return message;
}

export function printSplitPlan(
  slices: PrSplitSlice[],
  stagedFiles: StagedFile[]
): void {
  const color = stderrColorEnabled();
  const byPath = new Map(stagedFiles.map((file) => [file.path, file]));

  if (slices.length > 1) {
    console.error(paint(color, DIM, `${String(slices.length)} commits`));
    console.error("");
  }

  for (const [index, slice] of slices.entries()) {
    if (index > 0) {
      console.error("");
    }
    const indexLabel = paint(color, `${BOLD}${MAGENTA}`, `#${String(index + 1)}`);
    const subject = formatCommitSubject(slice.message, color);
    console.error(`${indexLabel} ${subject}`);
    for (const path of slice.paths) {
      console.error(formatFileLine(path, byPath.get(path)?.status ?? "M", color));
    }
  }
}

function formatFileLine(
  path: string,
  status: StagedFile["status"],
  color: boolean
): string {
  const marker = statusMarker(status);
  const markerColor =
    marker === "+" ? GREEN : marker === "-" ? RED : YELLOW;
  return `  ${paint(color, markerColor, marker)} ${path}`;
}

function statusMarker(status: StagedFile["status"]): "+" | "-" | "~" {
  if (status === "A" || status === "C") {
    return "+";
  }
  if (status === "D") {
    return "-";
  }
  return "~";
}

export function writeCommitSubject(message: string): void {
  const color = stdoutColorEnabled();
  const line = color ? formatCommitSubject(message, true) : message;
  process.stdout.write(`${line}\n`);
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}${RESET}`;
}
