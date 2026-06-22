import { unlink } from "node:fs/promises";
import readline from "node:readline";
import process from "node:process";

import { loadEntries, removeEntry, type MemoryEntry } from "./entries.ts";
import { formatEntryMarkdown } from "./entryMarkdown.ts";
import { markdown } from "../markdown/api.ts";
import { referencePath, type MemoryStore } from "./paths.ts";
import { printOk } from "./output.ts";
import { resolveScopeKey, resolveStore, scopeLabel } from "./scope.ts";

const ESC = "\u001B";
const ENTER_ALT = `${ESC}[?1049h`;
const LEAVE_ALT = `${ESC}[?1049l`;
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const CLR_EOL = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

const HELP = "Up/Down: move  Enter: view details  x: remove  q/Esc: quit";
const ESCAPE_CODE_TIMEOUT_MS = 25;

type ViewMode = "list" | "confirm-remove";

function enableKeypress(stdin: NodeJS.ReadStream): readline.Interface {
  const rl = readline.createInterface({
    input: stdin,
    escapeCodeTimeout: ESCAPE_CODE_TIMEOUT_MS
  });
  readline.emitKeypressEvents(stdin, rl);
  return rl;
}

function isEscapeKey(str: string, key: readline.Key | undefined): boolean {
  return key?.name === "escape" || str === ESC;
}

function formatRemovePrompt(entry: MemoryEntry, color: boolean): string {
  const id = paint(color, "\x1b[1m", entry.id);
  const detail = entry.hasDetails ? " and its reference file" : "";
  return paint(
    color,
    "\x1b[2m",
    `Remove ${id}${detail}? Enter to confirm, Esc to cancel`
  );
}

function stdoutColor(): boolean {
  return process.stdout.isTTY === true;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") {
    return text;
  }
  return `${code}${text}\x1b[0m`;
}

function formatRow(
  entry: MemoryEntry,
  selected: boolean,
  color: boolean
): string {
  const prefix = selected ? paint(color, "\x1b[36m", "> ") : "  ";
  const id = paint(color, "\x1b[1m", `${entry.id}:`);
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
    stdin.on("keypress", onKeypress);
  });
}

async function showDetails(
  store: MemoryStore,
  entry: MemoryEntry
): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  stdin.setRawMode(false);
  stdout.write(SHOW_CURSOR + LEAVE_ALT + HOME + CLR_EOS);
  stdout.write(markdown(await formatEntryMarkdown(store, entry)));
  stdout.write(
    `\n\n${paint(stdoutColor(), "\x1b[2m", "Press any key to return...")}\n`
  );

  await waitForKeypress();

  stdin.setRawMode(true);
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
}

async function performRemove(
  store: MemoryStore,
  id: string
): Promise<MemoryEntry[]> {
  const { entries, removed } = await removeEntry(store, id);

  if (!removed) {
    throw new Error(`No entry with id "${id}".`);
  }

  try {
    await unlink(referencePath(store, id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  printOk(`Removed ${id}.`);
  return entries;
}

/**
 * Interactive memory browser (human-only).
 */
export async function runMemoryInteractive(options: {
  global: boolean;
}): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("memory requires an interactive terminal.");
  }

  const store = resolveStore(options.global, process.cwd());
  let entries = await loadEntries(store);
  if (entries.length === 0) {
    console.log("Memories (none)");
    return;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  const color = stdoutColor();
  let selected = 0;
  let cleaned = false;
  let busy = false;
  let mode: ViewMode = "list";

  const draw = (): void => {
    const label = options.global
      ? "Global"
      : scopeLabel(resolveScopeKey(process.cwd()));
    const lines = [
      `Memories (${label})`,
      "",
      ...entries.map((entry, index) =>
        formatRow(entry, index === selected, color)
      ),
      "",
      paint(color, "\x1b[2m", HELP)
    ];
    if (mode === "confirm-remove") {
      const entry = entries[selected];
      if (entry) {
        lines.push("", formatRemovePrompt(entry, color));
      }
    }
    let buf = HOME;
    for (const line of lines) {
      buf += line + CLR_EOL + "\r\n";
    }
    buf += CLR_EOS;
    stdout.write(buf);
  };

  const rl = enableKeypress(stdin);

  const cleanup = (): void => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    rl.close();
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

  process.on("exit", () => {
    if (!cleaned) {
      rl.close();
    }
  });
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
  draw();

  await new Promise<void>((resolve) => {
    const onKeypress = (str: string, key: readline.Key | undefined): void => {
      if (busy) {
        return;
      }
      if (!key && !isEscapeKey(str, key)) {
        return;
      }

      if (key?.ctrl && key.name === "c") {
        stdin.off("keypress", onKeypress);
        finish(resolve);
        return;
      }

      if (mode === "confirm-remove") {
        if (key?.name === "return") {
          void (async () => {
            const entry = entries[selected];
            if (!entry) {
              mode = "list";
              draw();
              return;
            }
            busy = true;
            mode = "list";
            entries = await performRemove(store, entry.id);
            if (entries.length === 0) {
              stdin.off("keypress", onKeypress);
              finish(resolve);
              return;
            }
            selected = Math.min(selected, entries.length - 1);
            busy = false;
            draw();
          })();
          return;
        }
        if (isEscapeKey(str, key)) {
          mode = "list";
          draw();
        }
        return;
      }

      if (key?.name === "q" || isEscapeKey(str, key)) {
        stdin.off("keypress", onKeypress);
        finish(resolve);
        return;
      }

      switch (key?.name) {
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
            await showDetails(store, entry);
            busy = false;
            draw();
          })();
          return;
        case "x":
          mode = "confirm-remove";
          draw();
          return;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}
