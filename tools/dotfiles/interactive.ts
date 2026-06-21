import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  findPartialFolders,
  importPartialFolderLocals,
  promotePartialFolder,
  type DestinationEntry,
  type PartialFolderAnalysis
} from "./partial.ts";
import { paint, printError, stdoutColorEnabled } from "./paint.ts";
import { parseStowOutput } from "./parse.ts";
import {
  formatPathTreeEntries,
  type FormattedTreeLine,
  type PathTreeRole
} from "./tree.ts";
import type { StowOptions } from "./types.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STOW_PACKAGE = "home";
const STOW_TARGET = homedir();
const PACKAGE_ROOT = path.join(REPO_ROOT, STOW_PACKAGE);

const ESC = "\u001B";
/** Enter alternate screen buffer (preserves the user's terminal scrollback). */
const ENTER_ALT = `${ESC}[?1049h`;
/** Leave alternate screen buffer (restores prior terminal contents). */
const LEAVE_ALT = `${ESC}[?1049l`;
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const CLR_EOL = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const INVERT = `${ESC}[7m`;
const RESET = `${ESC}[0m`;
const ANSI_RE = /\u001b\[[0-9;]*m/g;

const HELP_PROMOTABLE = "Up/Down: move  Enter: adopt  o: open  q: quit";
const HELP_WITH_LOCALS = "Up/Down: move  i: import  o: open  q: quit";
const HELP_STOW_REMAINDER = "Up/Down: move  i: stow  o: open  q: quit";
const PANE_DIVIDER = " | ";

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

function vis(text: string): number {
  return stripAnsi(text).length;
}

function clipVis(text: string, max: number): string {
  const plain = stripAnsi(text);
  if (plain.length <= max) {
    return text;
  }
  if (max <= 3) {
    return plain.slice(0, max);
  }
  return plain.slice(0, max - 3) + "...";
}

function padEndVis(text: string, width: number): string {
  const used = vis(text);
  if (used >= width) {
    return clipVis(text, width);
  }
  return text + " ".repeat(width - used);
}

function termWidth(): number {
  return process.stdout.columns ?? 80;
}

function termHeight(): number {
  return process.stdout.rows ?? 24;
}

function openPath(targetPath: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer"
        : "xdg-open";
  spawn(cmd, [targetPath], { stdio: "ignore", detached: true }).unref();
}

function paneWidths(cols: number): { left: number; right: number } {
  const left = Math.floor((cols - vis(PANE_DIVIDER)) / 2);
  return { left, right: cols - left - vis(PANE_DIVIDER) };
}

function formatLocalEntryName(entry: DestinationEntry): string {
  if (entry.kind === "directory") {
    return `${entry.name}/`;
  }
  return entry.name;
}

function formatMissingEntryName(name: string, folderPath: string): string {
  const entryPath = path.join(PACKAGE_ROOT, folderPath, name);
  try {
    if (fs.statSync(entryPath).isDirectory()) {
      return `${name}/`;
    }
  } catch {
    // keep plain name
  }
  return name;
}

function entryLine(name: string, color: boolean, role: "path" | "dim"): string {
  return `  ${paint(color, role, name)}`;
}

function stowUnchangedPaths(): string[] {
  const result = spawnSync(
    "stow",
    [
      "-v2",
      "-d",
      REPO_ROOT,
      "-t",
      STOW_TARGET,
      "--dotfiles",
      STOW_PACKAGE,
      "-S"
    ],
    { encoding: "utf8" }
  );
  const lines = (result.stderr ?? "").split("\n").filter((line) => line.length > 0);
  return parseStowOutput(lines).unchanged;
}

function treePaintLine(
  color: boolean,
  selectedPath: string | undefined,
  promotable: boolean
): (prefix: string, name: string, role: PathTreeRole, fullPath: string) => string {
  return (prefix, name, role, fullPath) => {
    const selected = fullPath === selectedPath;
    const nameRole =
      role === "path" ? "path" : selected ? (promotable ? "ok" : "warn") : "dim";
    let paintedName = paint(color, nameRole, name);
    if (selected) {
      paintedName = color ? `${INVERT}${paintedName}${RESET}` : `>${name}<`;
    }
    return `${paint(color, "dim", prefix)}${paintedName}`;
  };
}

function treeScrollOffset(
  entries: FormattedTreeLine[],
  selectedPath: string | undefined,
  visibleHeight: number
): number {
  if (visibleHeight <= 0 || entries.length <= visibleHeight) {
    return 0;
  }

  const selectedIndex = selectedPath
    ? entries.findIndex((entry) => entry.fullPath === selectedPath)
    : -1;
  if (selectedIndex < 0) {
    return 0;
  }

  let start = selectedIndex - Math.floor(visibleHeight / 2);
  start = Math.max(0, Math.min(start, entries.length - visibleHeight));
  return start;
}

function hasStowedDescendant(unchanged: Set<string>, prefix: string): boolean {
  const needle = `${prefix}/`;
  for (const stowPath of unchanged) {
    if (stowPath.startsWith(needle)) {
      return true;
    }
  }
  return false;
}

function packageMissingFromDestination(
  folder: PartialFolderAnalysis,
  unchangedPaths: string[]
): string[] {
  const unchanged = new Set(unchangedPaths);
  const destNames = new Set(folder.entries.map((entry) => entry.name));
  const packageDir = path.join(PACKAGE_ROOT, folder.folderPath);

  try {
    return fs
      .readdirSync(packageDir)
      .filter((name) => {
        const rel = `${folder.folderPath}/${name}`;
        if (unchanged.has(rel) || hasStowedDescendant(unchanged, rel)) {
          return false;
        }
        return !destNames.has(name);
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function folderDetailLines(
  folder: PartialFolderAnalysis | undefined,
  unchangedPaths: string[],
  color: boolean
): string[] {
  if (!folder) {
    return [];
  }

  const stowed = folder.entries.filter((entry) => entry.kind === "stowed-symlink");
  const local = folder.entries.filter((entry) => entry.kind !== "stowed-symlink");
  const missing = packageMissingFromDestination(folder, unchangedPaths);

  const lines: string[] = [paint(color, "label", folder.targetDisplay), ""];

  lines.push(paint(color, "ok", "stowed"));
  if (stowed.length === 0) {
    lines.push(paint(color, "dim", "  (none)"));
  } else {
    for (const entry of stowed) {
      lines.push(entryLine(entry.name, color, "path"));
    }
  }

  lines.push("");
  lines.push(paint(color, "warn", "not stowed"));
  if (local.length === 0 && missing.length === 0) {
    lines.push(paint(color, "dim", "  (none)"));
  } else {
    for (const entry of local) {
      lines.push(entryLine(formatLocalEntryName(entry), color, "path"));
    }
    for (const name of missing) {
      lines.push(
        entryLine(formatMissingEntryName(name, folder.folderPath), color, "dim")
      );
    }
  }

  return lines;
}

function fitLines(
  lines: string[],
  maxRows: number,
  width: number,
  color: boolean
): string[] {
  if (maxRows <= 0) {
    return [];
  }

  if (lines.length <= maxRows) {
    return lines.map((line) => clipVis(padEndVis(line, width), width));
  }

  const hidden = lines.length - maxRows + 1;
  const fitted = lines
    .slice(0, maxRows - 1)
    .map((line) => clipVis(padEndVis(line, width), width));
  fitted.push(
    clipVis(padEndVis(paint(color, "dim", `  +${hidden} more`), width), width)
  );
  return fitted;
}

function buildRightPane(
  folder: PartialFolderAnalysis | undefined,
  unchangedPaths: string[],
  flash: { role: "ok" | "bad"; message: string } | undefined,
  help: string,
  color: boolean,
  rows: number,
  width: number
): string[] {
  const lines = [...folderDetailLines(folder, unchangedPaths, color)];
  if (flash) {
    lines.push("", paint(color, flash.role, flash.message));
  }

  const contentRows = Math.max(0, rows - 1);
  const pane = fitLines(lines, contentRows, width, color);
  while (pane.length < contentRows) {
    pane.push("");
  }
  pane.push(clipVis(padEndVis(paint(color, "dim", help), width), width));
  return pane.slice(0, rows);
}

function buildLeftPane(
  unchangedPaths: string[],
  selectedFolder: PartialFolderAnalysis | undefined,
  color: boolean,
  rows: number,
  width: number
): string[] {
  const treeEntries = formatPathTreeEntries(
    unchangedPaths,
    treePaintLine(color, selectedFolder?.folderPath, selectedFolder?.promotable === true)
  );
  const scroll = treeScrollOffset(treeEntries, selectedFolder?.folderPath, rows);
  const treeLines = treeEntries
    .slice(scroll, scroll + rows)
    .map((entry) => entry.line);

  const pane: string[] = [];
  for (let i = 0; i < rows; i++) {
    pane.push(clipVis(padEndVis(treeLines[i] ?? "", width), width));
  }

  return pane;
}

function helpForFolder(folder: PartialFolderAnalysis | undefined): string {
  if (!folder || folder.promotable) {
    return HELP_PROMOTABLE;
  }
  if (folder.blockerCount > 0) {
    return HELP_WITH_LOCALS;
  }
  return HELP_STOW_REMAINDER;
}

function mergeRow(left: string, right: string, leftWidth: number): string {
  return padEndVis(left, leftWidth) + PANE_DIVIDER + right;
}

function renderFrame(
  unchangedPaths: string[],
  folders: PartialFolderAnalysis[],
  selected: number,
  flash: { role: "ok" | "bad"; message: string } | undefined
): string {
  const color = stdoutColorEnabled();
  const rows = termHeight();
  const { left: leftWidth, right: rightWidth } = paneWidths(termWidth());
  const selectedFolder = folders[selected];
  const help = helpForFolder(selectedFolder);

  const leftPane = buildLeftPane(unchangedPaths, selectedFolder, color, rows, leftWidth);
  const rightPane = buildRightPane(
    selectedFolder,
    unchangedPaths,
    flash,
    help,
    color,
    rows,
    rightWidth
  );

  let buf = HOME;
  for (let row = 0; row < rows; row++) {
    buf += mergeRow(leftPane[row] ?? "", rightPane[row] ?? "", leftWidth);
    buf += CLR_EOL;
    if (row < rows - 1) {
      buf += "\r\n";
    }
  }
  buf += CLR_EOS;
  return buf;
}

/**
 * Interactive picker for folders that are only partially stowed (files inside,
 * not the directory itself). Returns when the user quits.
 */
export async function runPartialPromoteInteractive(_options: StowOptions): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printError("dotfiles: --interactive requires a terminal");
    return 1;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  let unchangedPaths = stowUnchangedPaths();
  let folders = findPartialFolders(unchangedPaths, PACKAGE_ROOT, STOW_TARGET);

  if (folders.length === 0) {
    const color = stdoutColorEnabled();
    console.log(paint(color, "dim", "  no partial folders"));
    return 0;
  }

  let selected = 0;
  let flash: { role: "ok" | "bad"; message: string } | undefined;
  let cleaned = false;

  const draw = (): void => {
    stdout.write(renderFrame(unchangedPaths, folders, selected, flash));
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

  const finish = (code: number, resolve: (value: number) => void): void => {
    cleanup();
    resolve(code);
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });
  process.on("SIGWINCH", draw);
  process.on("SIGHUP", () => {
    cleanup();
    process.exit(129);
  });

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
  draw();

  return await new Promise<number>((resolve) => {
    const onKeypress = (_str: string, key: readline.Key | undefined): void => {
      if (!key) {
        return;
      }

      flash = undefined;

      if (key.ctrl && key.name === "c") {
        stdin.off("keypress", onKeypress);
        process.off("SIGWINCH", draw);
        finish(130, resolve);
        return;
      }

      switch (key.name) {
        case "q":
        case "escape":
          stdin.off("keypress", onKeypress);
          process.off("SIGWINCH", draw);
          finish(0, resolve);
          return;
        case "up":
          if (folders.length > 0) {
            selected = (selected - 1 + folders.length) % folders.length;
            draw();
          }
          return;
        case "down":
          if (folders.length > 0) {
            selected = (selected + 1) % folders.length;
            draw();
          }
          return;
        case "return": {
          const folder = folders[selected];
          if (!folder) {
            return;
          }
          if (!folder.promotable) {
            draw();
            return;
          }
          const result = promotePartialFolder(
            folder.folderPath,
            REPO_ROOT,
            STOW_PACKAGE,
            STOW_TARGET
          );
          if (result.ok) {
            flash = {
              role: "ok",
              message: `adopted ${folder.folderPath}`
            };
          } else {
            flash = {
              role: "bad",
              message: `failed ${folder.folderPath}: ${result.error ?? "unknown error"}`
            };
          }
          unchangedPaths = stowUnchangedPaths();
          folders = findPartialFolders(unchangedPaths, PACKAGE_ROOT, STOW_TARGET);
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          draw();
          return;
        }
        case "o": {
          const folder = folders[selected];
          if (!folder) {
            return;
          }
          openPath(path.join(STOW_TARGET, folder.folderPath));
          return;
        }
        case "i": {
          const folder = folders[selected];
          if (!folder || folder.promotable) {
            draw();
            return;
          }
          const result = importPartialFolderLocals(
            folder.folderPath,
            unchangedPaths,
            REPO_ROOT,
            STOW_PACKAGE,
            STOW_TARGET
          );
          if (result.ok) {
            if (result.imported.length > 0) {
              flash = {
                role: "ok",
                message: `imported ${result.imported.length} into ${folder.folderPath}`
              };
            } else if (result.linked.length > 0) {
              flash = {
                role: "ok",
                message: `stowed ${result.linked.length} under ${folder.folderPath}`
              };
            } else {
              flash = {
                role: "ok",
                message: `no changes for ${folder.folderPath}`
              };
            }
          } else {
            flash = {
              role: "bad",
              message: `failed ${folder.folderPath}: ${result.error ?? "unknown error"}`
            };
          }
          unchangedPaths = stowUnchangedPaths();
          folders = findPartialFolders(unchangedPaths, PACKAGE_ROOT, STOW_TARGET);
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          draw();
          return;
        }
        default:
          return;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}
