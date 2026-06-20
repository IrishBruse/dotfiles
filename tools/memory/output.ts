import process from "node:process";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}${RESET}`;
}

function stderrColor(): boolean {
  return process.stderr.isTTY === true;
}

export function printError(message: string): void {
  console.error(paint(stderrColor(), RED, message));
}

export function printOk(message: string): void {
  console.error(paint(stderrColor(), GREEN, message));
}

export function printHint(message: string): void {
  console.error(paint(stderrColor(), DIM, message));
}
