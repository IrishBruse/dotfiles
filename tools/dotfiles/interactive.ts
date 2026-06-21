import { spawn } from "node:child_process";
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
import { queryDotfilesStow } from "./stow.ts";
import type { StowSummary } from "./types.ts";
import {
  formatPathTreeEntries,
  type FormattedTreeLine,
  type PathTreeRole
} from "./tree.ts";

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
const TAB_INACTIVE = `${ESC}[38;2;150;150;150m`;
const TAB_SELECTED = `${ESC}[38;2;255;255;255m`;
const ANSI_RE = /\u001b\[[0-9;]*m/g;

const ALL_TAB = "all";
const HELP_STOW = "s: stow";
const HELP_TABS = "<-/-> tabs";
const HELP_ALL = `Up/Down: move  ${HELP_STOW}  o: open  ${HELP_TABS}  q: quit`;
const HELP_NO_PARTIAL = `${HELP_STOW}  ${HELP_TABS}  q: quit`;
const HELP_PROMOTABLE = `Up/Down: move  Enter: adopt  ${HELP_STOW}  o: open  ${HELP_TABS}  q: quit`;
const HELP_WITH_LOCALS = `Up/Down: move  i: import  ${HELP_STOW}  o: open  ${HELP_TABS}  q: quit`;
const HELP_STOW_REMAINDER = `Up/Down: move  i: stow  ${HELP_STOW}  o: open  ${HELP_TABS}  q: quit`;
const TREE_SCROLL_PADDING = 2;

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
  const left = Math.floor(cols / 2);
  return { left, right: cols - left };
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

function refreshStowState(dryRun: boolean): { unchangedPaths: string[]; summary: StowSummary; status: number } {
  const { summary, status } = queryDotfilesStow(dryRun);
  return { unchangedPaths: summary.unchanged, summary, status };
}

function stowFlashMessage(summary: StowSummary, status: number): { role: "ok" | "bad"; message: string } {
  if (status !== 0 || summary.conflicts.length > 0) {
    return {
      role: "bad",
      message: summary.conflicts[0] ?? summary.warnings[0] ?? "stow failed"
    };
  }
  if (summary.linked.length > 0) {
    return { role: "ok", message: `linked ${summary.linked.length}` };
  }
  return { role: "ok", message: "stow up to date" };
}

function reloadPartialFolders(unchangedPaths: string[]): PartialFolderAnalysis[] {
  return findPartialFolders(unchangedPaths, PACKAGE_ROOT, STOW_TARGET);
}

function topLevelTabNames(
  unchangedPaths: string[],
  folders: PartialFolderAnalysis[]
): string[] {
  const names = new Set<string>();
  for (const stowPath of unchangedPaths) {
    const first = stowPath.split("/")[0];
    if (first) {
      names.add(first);
    }
  }
  for (const folder of folders) {
    const first = folder.folderPath.split("/")[0];
    if (first) {
      names.add(first);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function buildTabNames(
  unchangedPaths: string[],
  folders: PartialFolderAnalysis[]
): string[] {
  return [ALL_TAB, ...topLevelTabNames(unchangedPaths, folders)];
}

function activeTabPrefix(tabNames: string[], tabIndex: number): string | undefined {
  if (tabIndex <= 0 || tabIndex >= tabNames.length) {
    return undefined;
  }
  return tabNames[tabIndex];
}

function filterPathsByTab(paths: string[], tabPrefix: string | undefined): string[] {
  if (!tabPrefix) {
    return paths;
  }
  return paths.filter(
    (stowPath) => stowPath === tabPrefix || stowPath.startsWith(`${tabPrefix}/`)
  );
}

function filterFoldersByTab(
  folders: PartialFolderAnalysis[],
  tabPrefix: string | undefined
): PartialFolderAnalysis[] {
  if (!tabPrefix) {
    return folders;
  }
  return folders.filter(
    (folder) =>
      folder.folderPath === tabPrefix || folder.folderPath.startsWith(`${tabPrefix}/`)
  );
}

function folderForTreePath(
  folders: PartialFolderAnalysis[],
  treePath: string | undefined
): PartialFolderAnalysis | undefined {
  if (!treePath) {
    return undefined;
  }
  return folders.find((folder) => folder.folderPath === treePath);
}

function formatTabGraphic(tabIndex: number, tabNames: string[], width: number): string {
  const sep = "  |  ";
  const parts: string[] = [];
  for (let i = 0; i < tabNames.length; i++) {
    const name = tabNames[i]!;
    parts.push(
      i === tabIndex ? TAB_SELECTED + name + RESET : TAB_INACTIVE + name + RESET
    );
  }
  return clipVis(parts.join(sep), width);
}

function displayTreePath(treePath: string): string {
  return `~/${treePath}`;
}

function pathDetailLines(treePath: string | undefined, color: boolean): string[] {
  if (!treePath) {
    return [paint(color, "dim", "no stowed paths")];
  }
  return [paint(color, "label", displayTreePath(treePath))];
}

function treeIndexForPath(
  entries: FormattedTreeLine[],
  treePath: string | undefined
): number {
  if (!treePath) {
    return 0;
  }
  const index = entries.findIndex((entry) => entry.fullPath === treePath);
  return index >= 0 ? index : 0;
}

function scrollSelectionToTop(
  selectedIndex: number,
  treeLength: number,
  visibleRows: number,
  padding: number = TREE_SCROLL_PADDING
): number {
  if (treeLength <= visibleRows) {
    return 0;
  }
  const maxScroll = treeLength - visibleRows;
  return Math.max(0, Math.min(selectedIndex - padding, maxScroll));
}

function syncLeftScrollToSelection(
  unchangedPaths: string[],
  selectedFolder: PartialFolderAnalysis | undefined,
  color: boolean,
  rows: number
): number {
  const treeEntries = formatPathTreeEntries(
    unchangedPaths,
    treePaintLine(color, selectedFolder?.folderPath, selectedFolder?.promotable === true)
  );
  const index = treeIndexForPath(treeEntries, selectedFolder?.folderPath);
  return scrollSelectionToTop(index, treeEntries.length, rows);
}

function clampScroll(scroll: number, contentLines: number, visibleRows: number): number {
  const max = Math.max(0, contentLines - visibleRows);
  return Math.max(0, Math.min(scroll, max));
}

function scrollBy(
  scroll: number,
  delta: number,
  contentLines: number,
  visibleRows: number
): number {
  return clampScroll(scroll + delta, contentLines, visibleRows);
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

function rightContentLines(
  folder: PartialFolderAnalysis | undefined,
  unchangedPaths: string[],
  flash: { role: "ok" | "bad"; message: string } | undefined,
  color: boolean,
  hasPartialFolders: boolean
): string[] {
  const lines: string[] = [];
  if (!hasPartialFolders) {
    lines.push(paint(color, "dim", "no partial folders"));
    lines.push("");
  }
  lines.push(...folderDetailLines(folder, unchangedPaths, color));
  if (flash) {
    lines.push("", paint(color, flash.role, flash.message));
  }
  return lines;
}

function buildRightPane(
  folder: PartialFolderAnalysis | undefined,
  unchangedPaths: string[],
  flash: { role: "ok" | "bad"; message: string } | undefined,
  help: string,
  color: boolean,
  rows: number,
  width: number,
  hasPartialFolders: boolean,
  scroll: number
): string[] {
  const contentRows = Math.max(0, rows - 1);
  const content = rightContentLines(folder, unchangedPaths, flash, color, hasPartialFolders);
  const offset = clampScroll(scroll, content.length, contentRows);
  const pane = content
    .slice(offset, offset + contentRows)
    .map((line) => clipVis(padEndVis(line, width), width));
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
  width: number,
  scroll: number
): string[] {
  const treeEntries = formatPathTreeEntries(
    unchangedPaths,
    treePaintLine(color, selectedFolder?.folderPath, selectedFolder?.promotable === true)
  );
  const offset = clampScroll(scroll, treeEntries.length, rows);
  const treeLines = treeEntries
    .slice(offset, offset + rows)
    .map((entry) => entry.line);

  const pane: string[] = [];
  for (let i = 0; i < rows; i++) {
    pane.push(clipVis(padEndVis(treeLines[i] ?? "", width), width));
  }

  return pane;
}

function helpForFolder(
  folder: PartialFolderAnalysis | undefined,
  hasPartialFolders: boolean
): string {
  if (!hasPartialFolders) {
    return HELP_NO_PARTIAL;
  }
  if (!folder || folder.promotable) {
    return HELP_PROMOTABLE;
  }
  if (folder.blockerCount > 0) {
    return HELP_WITH_LOCALS;
  }
  return HELP_STOW_REMAINDER;
}

function mergeRow(left: string, right: string, leftWidth: number): string {
  return padEndVis(left, leftWidth) + right;
}

function renderFrame(
  unchangedPaths: string[],
  folders: PartialFolderAnalysis[],
  selected: number,
  flash: { role: "ok" | "bad"; message: string } | undefined,
  leftScroll: number,
  rightScroll: number
): string {
  const color = stdoutColorEnabled();
  const rows = termHeight();
  const { left: leftWidth, right: rightWidth } = paneWidths(termWidth());
  const selectedFolder = folders[selected];
  const hasPartialFolders = folders.length > 0;
  const help = helpForFolder(selectedFolder, hasPartialFolders);

  const leftPane = buildLeftPane(
    unchangedPaths,
    selectedFolder,
    color,
    rows,
    leftWidth,
    leftScroll
  );
  const rightPane = buildRightPane(
    selectedFolder,
    unchangedPaths,
    flash,
    help,
    color,
    rows,
    rightWidth,
    hasPartialFolders,
    rightScroll
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
export async function runPartialPromoteInteractive(): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printError("dotfiles: requires a terminal");
    return 1;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  let { unchangedPaths } = refreshStowState(true);
  let folders = reloadPartialFolders(unchangedPaths);

  let selected = 0;
  let leftScroll = 0;
  let rightScroll = 0;
  let flash: { role: "ok" | "bad"; message: string } | undefined;
  let cleaned = false;

  const scrollStep = (): number => Math.max(1, termHeight() - 1);

  const clampScrollState = (): void => {
    const rows = termHeight();
    const color = stdoutColorEnabled();
    const selectedFolder = folders[selected];
    const hasPartialFolders = folders.length > 0;
    const treeEntries = formatPathTreeEntries(
      unchangedPaths,
      treePaintLine(color, selectedFolder?.folderPath, selectedFolder?.promotable === true)
    );
    const rightLines = rightContentLines(
      selectedFolder,
      unchangedPaths,
      flash,
      color,
      hasPartialFolders
    );
    leftScroll = clampScroll(leftScroll, treeEntries.length, rows);
    rightScroll = clampScroll(rightScroll, rightLines.length, Math.max(0, rows - 1));
  };

  const scrollView = (delta: number): void => {
    const rows = termHeight();
    const color = stdoutColorEnabled();
    const selectedFolder = folders[selected];
    const hasPartialFolders = folders.length > 0;
    const treeEntries = formatPathTreeEntries(
      unchangedPaths,
      treePaintLine(color, selectedFolder?.folderPath, selectedFolder?.promotable === true)
    );
    const rightLines = rightContentLines(
      selectedFolder,
      unchangedPaths,
      flash,
      color,
      hasPartialFolders
    );
    leftScroll = scrollBy(leftScroll, delta, treeEntries.length, rows);
    rightScroll = scrollBy(rightScroll, delta, rightLines.length, Math.max(0, rows - 1));
  };

  const draw = (): void => {
    clampScrollState();
    stdout.write(
      renderFrame(unchangedPaths, folders, selected, flash, leftScroll, rightScroll)
    );
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
  leftScroll = syncLeftScrollToSelection(
    unchangedPaths,
    folders[selected],
    stdoutColorEnabled(),
    termHeight()
  );
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
            rightScroll = 0;
            leftScroll = syncLeftScrollToSelection(
              unchangedPaths,
              folders[selected],
              stdoutColorEnabled(),
              termHeight()
            );
            draw();
          }
          return;
        case "down":
          if (folders.length > 0) {
            selected = (selected + 1) % folders.length;
            rightScroll = 0;
            leftScroll = syncLeftScrollToSelection(
              unchangedPaths,
              folders[selected],
              stdoutColorEnabled(),
              termHeight()
            );
            draw();
          }
          return;
        case "pageup":
          scrollView(-scrollStep());
          draw();
          return;
        case "pagedown":
          scrollView(scrollStep());
          draw();
          return;
        case "s": {
          const stow = refreshStowState(false);
          unchangedPaths = stow.unchangedPaths;
          folders = reloadPartialFolders(unchangedPaths);
          flash = stowFlashMessage(stow.summary, stow.status);
          rightScroll = 0;
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          leftScroll = syncLeftScrollToSelection(
            unchangedPaths,
            folders[selected],
            stdoutColorEnabled(),
            termHeight()
          );
          draw();
          return;
        }
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
          unchangedPaths = refreshStowState(false).unchangedPaths;
          folders = reloadPartialFolders(unchangedPaths);
          rightScroll = 0;
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          leftScroll = syncLeftScrollToSelection(
            unchangedPaths,
            folders[selected],
            stdoutColorEnabled(),
            termHeight()
          );
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
          unchangedPaths = refreshStowState(false).unchangedPaths;
          folders = reloadPartialFolders(unchangedPaths);
          rightScroll = 0;
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          leftScroll = syncLeftScrollToSelection(
            unchangedPaths,
            folders[selected],
            stdoutColorEnabled(),
            termHeight()
          );
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
