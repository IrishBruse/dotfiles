import process from "node:process";

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function paint(
  enabled: boolean,
  code: string,
  text: string
): string {
  if (!enabled || text === "") return text;
  return `${code}${text}${RESET}`;
}

export function printError(msg: string): void {
  const c = process.stderr.isTTY === true;
  process.stderr.write(`${paint(c, RED, "error")}: ${msg}\n`);
}

export function printPulled(
  pageId: string,
  title: string,
  relPath: string
): void {
  const c = process.stdout.isTTY === true;
  process.stdout.write(
    `${paint(c, CYAN, pageId)}  ${title}\n${paint(c, DIM, "  -> ")}${relPath}\n`
  );
}

export function printPullSummary(total: number): void {
  const c = process.stdout.isTTY === true;
  const noun = total === 1 ? "page" : "pages";
  process.stdout.write(`\n${paint(c, GREEN, `Pulled ${total} ${noun}.`)}\n`);
}

export function printStatusLine(
  state: string,
  pageId: string,
  title: string,
  relPath: string
): void {
  const c = process.stdout.isTTY === true;
  const code =
    state === "clean" ? GREEN : state === "behind" ? YELLOW : RED;
  process.stdout.write(
    `${paint(c, code, state.padEnd(8))} ${paint(c, CYAN, pageId)}  ${title}\n${paint(c, DIM, "         ")}${relPath}\n`
  );
}
