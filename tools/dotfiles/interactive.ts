import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  findPartialFolders,
  promotePartialFolder,
  type DestinationEntry,
  type PartialFolderAnalysis
} from "./partial.ts";
import { paint, printError, stdoutColorEnabled } from "./paint.ts";
import { parseStowOutput } from "./parse.ts";
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

const HELP_PROMOTABLE =
  "j/k up/down: move  Enter: promote  q/Esc: done";
const HELP_BLOCKED =
  "j/k up/down: move  Enter: blocked  q/Esc: done";
const MAX_PREVIEW_ENTRIES = 12;

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

function entryLabel(entry: DestinationEntry, color: boolean): string {
  const name = paint(color, "path", entry.name.padEnd(22));
  switch (entry.kind) {
    case "stowed-symlink":
      return `${name}${paint(color, "dim", "symlink ")}${paint(color, "ok", entry.detail)}`;
    case "other-symlink":
      return `${name}${paint(color, "dim", "symlink ")}${paint(color, "warn", entry.detail)}`;
    case "directory":
      return `${name}${paint(color, "warn", entry.detail)}`;
    case "file":
      return `${name}${paint(color, "warn", entry.detail)}`;
  }
}

function previewLines(
  folder: PartialFolderAnalysis | undefined,
  color: boolean
): string[] {
  if (!folder) {
    return [];
  }

  const lines: string[] = [
    "",
    `  ${paint(color, "label", "why")} ${folder.summary}`,
    `  ${paint(color, "label", "destination")}`
  ];

  const shown = folder.entries.slice(0, MAX_PREVIEW_ENTRIES);
  for (const entry of shown) {
    lines.push(`    ${entryLabel(entry, color)}`);
  }
  const hidden = folder.entries.length - shown.length;
  if (hidden > 0) {
    lines.push(`    ${paint(color, "dim", `... ${hidden} more`)}`);
  }

  if (folder.promotable) {
    lines.push(
      "",
      `  ${paint(color, "dim", "Enter promotes to a single directory symlink")}`
    );
  } else if (folder.blockerCount > 0) {
    lines.push(
      "",
      `  ${paint(color, "warn", "cannot promote until destination has only dotfiles symlinks")}`
    );
  } else {
    lines.push(
      "",
      `  ${paint(color, "warn", "cannot promote: package is not fully stowed under this folder")}`
    );
  }

  return lines;
}

function renderLines(
  folders: PartialFolderAnalysis[],
  selected: number,
  flash: { role: "ok" | "bad"; message: string } | undefined
): string[] {
  const color = stdoutColorEnabled();
  const selectedFolder = folders[selected];
  const help =
    selectedFolder?.promotable === true ? HELP_PROMOTABLE : HELP_BLOCKED;

  const lines: string[] = [
    `${paint(color, "label", "dotfiles")} ${paint(color, "dim", "partial folders (files stowed inside, not the directory)")}`,
    ""
  ];

  if (folders.length === 0) {
    lines.push(paint(color, "ok", "  no partial folders"));
  } else {
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]!;
      const marker = i === selected ? paint(color, "label", ">") : " ";
      const nameRole = i === selected ? "ok" : folder.promotable ? "path" : "warn";
      const suffix = folder.promotable
        ? ""
        : paint(color, "dim", "  (blocked)");
      const name = paint(color, nameRole, folder.folderPath);
      lines.push(`  ${marker} ${name}${suffix}`);
    }
  }

  lines.push(...previewLines(selectedFolder, color));

  if (flash) {
    lines.push("", `  ${paint(color, flash.role, flash.message)}`);
  }

  lines.push("", paint(color, "dim", help));
  return lines;
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
  let folders = findPartialFolders(stowUnchangedPaths(), PACKAGE_ROOT, STOW_TARGET);

  if (folders.length === 0) {
    const color = stdoutColorEnabled();
    console.log(paint(color, "dim", "  no partial folders"));
    return 0;
  }

  let selected = 0;
  let flash: { role: "ok" | "bad"; message: string } | undefined;
  let prevViewportLines = 0;
  let cleaned = false;

  const draw = (): void => {
    const lines = renderLines(folders, selected, flash);
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
        finish(130, resolve);
        return;
      }

      switch (key.name) {
        case "q":
        case "escape":
          stdin.off("keypress", onKeypress);
          finish(0, resolve);
          return;
        case "up":
        case "k":
          if (folders.length > 0) {
            selected = (selected - 1 + folders.length) % folders.length;
            draw();
          }
          return;
        case "down":
        case "j":
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
              message: `promoted ${folder.folderPath}`
            };
          } else {
            flash = {
              role: "bad",
              message: `failed ${folder.folderPath}: ${result.error ?? "unknown error"}`
            };
          }
          folders = findPartialFolders(
            stowUnchangedPaths(),
            PACKAGE_ROOT,
            STOW_TARGET
          );
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
