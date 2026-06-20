import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import process from "node:process";

import type { MemoryEntry } from "./entries.ts";

const ESC = "\u001B";
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

const HELP = "j/k: move  Enter: select  q/Esc: cancel";

function stdoutColor(): boolean {
  return process.stdout.isTTY === true;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}\x1b[0m`;
}

/**
 * Require stdin and stdout to be interactive terminals.
 */
export function assertInteractiveTerminal(command: string): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(`memory ${command} requires an interactive terminal.`);
  }
}

function formatRow(entry: MemoryEntry, selected: boolean, color: boolean): string {
  const prefix = selected ? paint(color, "\x1b[36m", "> ") : "  ";
  const id = paint(color, "\x1b[1m", `[${entry.id}]`);
  const detail = entry.hasDetails
    ? paint(color, "\x1b[2m", " (has reference detail)")
    : "";
  return `${prefix}${id} ${entry.text}${detail}`;
}

/**
 * Arrow-key picker for one memory entry.
 *
 * @return selected entry, or null when cancelled
 */
export function pickEntry(entries: MemoryEntry[]): Promise<MemoryEntry | null> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const color = stdoutColor();
    let selected = 0;
    let settled = false;

    const finish = (entry: MemoryEntry | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      stdin.removeListener("keypress", onKeypress);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      stdout.write(SHOW_CURSOR + HOME + CLR_EOS);
      resolve(entry);
    };

    const draw = (): void => {
      stdout.write(HIDE_CURSOR + HOME + CLR_EOS);
      stdout.write("Select an entry to remove:\n\n");
      for (let i = 0; i < entries.length; i++) {
        stdout.write(`${formatRow(entries[i]!, i === selected, color)}\n`);
      }
      stdout.write(`\n${paint(color, "\x1b[2m", HELP)}\n`);
    };

    const onKeypress = (_str: string, key: readline.Key | undefined): void => {
      if (!key) {
        return;
      }
      if (key.ctrl && key.name === "c") {
        finish(null);
        return;
      }
      switch (key.name) {
        case "q":
        case "escape":
          finish(null);
          return;
        case "up":
        case "k":
          selected = (selected - 1 + entries.length) % entries.length;
          draw();
          return;
        case "down":
        case "j":
          selected = (selected + 1) % entries.length;
          draw();
          return;
        case "return": {
          const entry = entries[selected];
          finish(entry ?? null);
          return;
        }
      }
    };

    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    draw();
    stdin.on("keypress", onKeypress);
  });
}

/**
 * Ask for confirmation before deleting an entry.
 */
export async function confirmRemove(entry: MemoryEntry): Promise<boolean> {
  const color = stdoutColor();
  const id = paint(color, "\x1b[1m", entry.id);
  const detail = entry.hasDetails ? " and its reference file" : "";
  const prompt = `Remove [${id}]${detail}? [y/N] `;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(prompt);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
