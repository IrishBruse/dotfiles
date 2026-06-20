import process from "node:process";

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export type PaintRole = "label" | "ok" | "warn" | "bad" | "dim" | "path";

const ROLE_CODES: Record<PaintRole, string> = {
  label: CYAN,
  ok: GREEN,
  warn: YELLOW,
  bad: RED,
  dim: DIM,
  path: ""
};

export function stdoutColorEnabled(): boolean {
  return process.stdout.isTTY === true;
}

export function stderrColorEnabled(): boolean {
  return process.stderr.isTTY === true;
}

export function paint(
  enabled: boolean,
  role: PaintRole,
  text: string
): string {
  if (!enabled || text === "") {
    return text;
  }
  const code = ROLE_CODES[role];
  if (code === "") {
    return text;
  }
  return `${code}${text}${RESET}`;
}

export function printError(message: string): void {
  console.error(paint(stderrColorEnabled(), "bad", message));
}
