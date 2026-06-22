import { unlink } from "node:fs/promises";
import readline from "node:readline";
import process from "node:process";

import { loadEntries, removeEntry, type MemoryEntry } from "./entries.ts";
import { formatEntryMarkdown } from "./entryMarkdown.ts";
import { formatListMarkdown } from "./listEntries.ts";
import { markdown } from "../markdown/api.ts";
import { globalStore, referencePath, type MemoryStore } from "./paths.ts";
import { printOk } from "./output.ts";
import { localStore, resolveScopeKey, scopeLabel } from "./scope.ts";

const ESC = "\u001B";
const ENTER_ALT = `${ESC}[?1049h`;
const LEAVE_ALT = `${ESC}[?1049l`;
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const CLR_EOL = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

const HELP =
  "Up/Down: move  Enter: view details  p: print markdown  x: remove  q/Esc: quit";
const ESCAPE_CODE_TIMEOUT_MS = 25;

type ViewMode = "list" | "confirm-remove";

type InteractiveSection = {
  title: string;
  store: MemoryStore;
  entries: MemoryEntry[];
};

type InteractiveRow = {
  section: InteractiveSection;
  entry: MemoryEntry;
};

async function loadSections(globalOnly: boolean): Promise<InteractiveSection[]> {
  const global = globalStore();
  if (globalOnly) {
    return [{ title: "Global", store: global, entries: await loadEntries(global) }];
  }

  const local = localStore(process.cwd());
  const [localEntries, globalEntries] = await Promise.all([
    loadEntries(local),
    loadEntries(global),
  ]);

  return [
    { title: "Global", store: global, entries: globalEntries },
    {
      title: `Local (${scopeLabel(resolveScopeKey(process.cwd()))})`,
      store: local,
      entries: localEntries,
    },
  ];
}

function flattenSections(sections: InteractiveSection[]): InteractiveRow[] {
  const rows: InteractiveRow[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      rows.push({ section, entry });
    }
  }
  return rows;
}

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

async function performRemove(store: MemoryStore, id: string): Promise<void> {
  const { removed } = await removeEntry(store, id);

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
}

function buildListLines(
  sections: InteractiveSection[],
  selected: number,
  color: boolean
): string[] {
  const lines = ["Memories", ""];
  let rowIndex = 0;

  for (const section of sections) {
    lines.push(paint(color, "\x1b[1m", section.title));
    if (section.entries.length === 0) {
      lines.push(paint(color, "\x1b[2m", "  (none)"));
    } else {
      for (const entry of section.entries) {
        lines.push(formatRow(entry, rowIndex === selected, color));
        rowIndex++;
      }
    }
    lines.push("");
  }

  return lines;
}

/**
 * Interactive memory browser (human-only).
 */
export async function runMemoryInteractive(options: {
  globalOnly: boolean;
}): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("memory requires an interactive terminal.");
  }

  let sections = await loadSections(options.globalOnly);
  let rows = flattenSections(sections);

  const stdin = process.stdin;
  const stdout = process.stdout;
  const color = stdoutColor();
  let selected = 0;
  let cleaned = false;
  let busy = false;
  let mode: ViewMode = "list";

  const draw = (): void => {
    const lines = [
      ...buildListLines(sections, selected, color),
      paint(color, "\x1b[2m", HELP)
    ];
    if (mode === "confirm-remove") {
      const row = rows[selected];
      if (row) {
        lines.push("", formatRemovePrompt(row.entry, color));
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
            const row = rows[selected];
            if (!row) {
              mode = "list";
              draw();
              return;
            }
            busy = true;
            mode = "list";
            await performRemove(row.section.store, row.entry.id);
            sections = await loadSections(options.globalOnly);
            rows = flattenSections(sections);
            selected = rows.length === 0 ? 0 : Math.min(selected, rows.length - 1);
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
          if (rows.length === 0) {
            return;
          }
          selected = (selected - 1 + rows.length) % rows.length;
          draw();
          return;
        case "down":
          if (rows.length === 0) {
            return;
          }
          selected = (selected + 1) % rows.length;
          draw();
          return;
        case "return":
          if (rows.length === 0) {
            return;
          }
          void (async () => {
            const row = rows[selected];
            if (!row) {
              return;
            }
            busy = true;
            await showDetails(row.section.store, row.entry);
            busy = false;
            draw();
          })();
          return;
        case "p":
          void (async () => {
            busy = true;
            stdin.off("keypress", onKeypress);
            const agentMarkdown = await formatListMarkdown({
              cwd: process.cwd(),
              globalOnly: options.globalOnly,
              omitEmpty: true
            });
            finish(resolve);
            if (agentMarkdown) {
              stdout.write(`${agentMarkdown}\n`);
            }
          })();
          return;
        case "x":
          if (rows.length === 0) {
            return;
          }
          mode = "confirm-remove";
          draw();
          return;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}
