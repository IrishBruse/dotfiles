import { unlink } from "node:fs/promises";
import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import process from "node:process";

import { loadEntries, removeEntry, type MemoryEntry } from "./entries.ts";
import { formatEntryMarkdown } from "./entryMarkdown.ts";
import { markdown } from "../markdown/api.ts";
import { printOk } from "./output.ts";
import { referencePath } from "./paths.ts";
import { writeSkill } from "./renderSkill.ts";

const ESC = "\u001B";
const ENTER_ALT = `${ESC}[?1049h`;
const LEAVE_ALT = `${ESC}[?1049l`;
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const CLR_EOL = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

const HELP = "Up/Down: move  Enter: view details  x: remove  q/Esc: quit";

function stdoutColor(): boolean {
  return process.stdout.isTTY === true;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}\x1b[0m`;
}

function formatRow(entry: MemoryEntry, selected: boolean, color: boolean): string {
  const prefix = selected ? paint(color, "\x1b[36m", "> ") : "  ";
  const id = paint(color, "\x1b[1m", `[${entry.id}]`);
  const detail = entry.hasDetails
    ? paint(color, "\x1b[2m", " (has reference detail)")
    : "";
  return `${prefix}${id} ${entry.text}${detail}`;
}

function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.resume();
    const onKeypress = (): void => {
      stdin.removeListener("keypress", onKeypress);
      resolve();
    };
    readline.emitKeypressEvents(stdin);
    stdin.on("keypress", onKeypress);
  });
}

async function showDetails(entry: MemoryEntry): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  stdin.setRawMode(false);
  stdout.write(SHOW_CURSOR + LEAVE_ALT + HOME + CLR_EOS);
  stdout.write(markdown(await formatEntryMarkdown(entry)));
  stdout.write(`\n\n${paint(stdoutColor(), "\x1b[2m", "Press any key to return...")}\n`);

  await waitForKeypress();

  stdin.setRawMode(true);
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
}

async function confirmRemove(entry: MemoryEntry): Promise<boolean> {
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

async function performRemove(id: string): Promise<MemoryEntry[]> {
  const { entries, removed } = await removeEntry(id);

  if (!removed) {
    throw new Error(`No entry with id "${id}".`);
  }

  try {
    await unlink(referencePath(id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  await writeSkill(entries);
  printOk(`Removed ${id}.`);
  return entries;
}

/**
 * Interactive memory browser (human-only).
 */
export async function runMemoryInteractive(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("memory requires an interactive terminal.");
  }

  let entries = await loadEntries();
  if (entries.length === 0) {
    console.log("Things learned recently (none)");
    return;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  const color = stdoutColor();
  let selected = 0;
  let prevViewportLines = 0;
  let cleaned = false;
  let busy = false;

  const draw = (): void => {
    const lines = [
      "Things learned recently",
      "",
      ...entries.map((entry, index) => formatRow(entry, index === selected, color)),
      "",
      paint(color, "\x1b[2m", HELP),
    ];
    let buf = HOME;
    for (const line of lines) {
      buf += line + CLR_EOL + "\r\n";
    }
    if (lines.length < prevViewportLines) {
      buf += CLR_EOS;
    }
    stdout.write(buf);
    prevViewportLines = lines.length;
  };

  const cleanup = (): void => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdout.write(SHOW_CURSOR + LEAVE_ALT);
    stdin.pause();
  };

  const finish = (resolve: () => void): void => {
    cleanup();
    resolve();
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
  draw();

  await new Promise<void>((resolve) => {
    const onKeypress = (
      _str: string,
      key: readline.Key | undefined
    ): void => {
      if (!key || busy) {
        return;
      }

      if (key.ctrl && key.name === "c") {
        stdin.off("keypress", onKeypress);
        finish(resolve);
        return;
      }

      switch (key.name) {
        case "q":
        case "escape":
          stdin.off("keypress", onKeypress);
          finish(resolve);
          return;
        case "up":
          selected = (selected - 1 + entries.length) % entries.length;
          draw();
          return;
        case "down":
          selected = (selected + 1) % entries.length;
          draw();
          return;
        case "return":
          void (async () => {
            const entry = entries[selected];
            if (!entry) {
              return;
            }
            busy = true;
            await showDetails(entry);
            busy = false;
            draw();
          })();
          return;
        case "x":
          void (async () => {
            const entry = entries[selected];
            if (!entry) {
              return;
            }
            busy = true;
            stdin.setRawMode(false);
            const confirmed = await confirmRemove(entry);
            if (!confirmed) {
              stdin.setRawMode(true);
              busy = false;
              draw();
              return;
            }
            entries = await performRemove(entry.id);
            if (entries.length === 0) {
              stdin.off("keypress", onKeypress);
              finish(resolve);
              return;
            }
            selected = Math.min(selected, entries.length - 1);
            stdin.setRawMode(true);
            busy = false;
            draw();
          })();
          return;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}
