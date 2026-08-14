import process from "node:process";

import { paint, type PaintRole } from "../../../dotfiles/api.ts";

const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export function outputColorEnabled(): boolean {
  return process.stderr.isTTY === true && process.stdout.isTTY === true;
}

export function stdoutPaintEnabled(): boolean {
  return process.stdout.isTTY === true;
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export function paintOutput(role: PaintRole, text: string): string {
  if (!outputColorEnabled()) return text;
  return paint(true, role, text);
}

export function paintStdout(role: PaintRole, text: string): string {
  if (!stdoutPaintEnabled()) return text;
  return paint(true, role, text);
}

export function formatOutput(text: string): string {
  if (outputColorEnabled()) return text;
  return stripAnsi(text);
}
