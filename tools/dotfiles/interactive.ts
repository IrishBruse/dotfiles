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

const HELP_PROMOTABLE = "up/down: move  Enter: promote  q: quit";
const HELP_BLOCKED = "up/down: move  q: quit";
const NAME_COL = 28;
const MAX_LOCAL_ENTRIES = 8;
const MAX_LINKED_ENTRIES = 6;

function padPlain(text: string, width: number): string {
  if (text.length >= width) {
    return truncatePlain(text, width);
  }
  return text.padEnd(width);
}

function truncatePlain(text: string, width: number): string {
  if (text.length <= width) {
    return text;
  }
  if (width <= 3) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 3)}...`;
}

function displayLinkTarget(detail: string): string {
  const homeIdx = detail.indexOf("home/");
  if (homeIdx >= 0) {
    return detail.slice(homeIdx);
  }
  return truncatePlain(detail, 44);
}

function localKindLabel(entry: DestinationEntry): string {
  switch (entry.kind) {
    case "file":
      return "file";
    case "directory":
      return "dir";
    case "other-symlink":
      return "symlink";
    default:
      return "";
  }
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

function localEntryLine(entry: DestinationEntry, color: boolean): string {
  const name = paint(color, "warn", padPlain(entry.name, NAME_COL));
  const kind = paint(color, "dim", localKindLabel(entry));
  return `      ${name}  ${kind}`;
}

function linkedEntryLine(entry: DestinationEntry, color: boolean): string {
  const name = paint(color, "ok", padPlain(entry.name, NAME_COL));
  const target = paint(color, "dim", displayLinkTarget(entry.detail));
  return `      ${name}  ${target}`;
}

function appendEntrySection(
  lines: string[],
  label: string,
  hint: string,
  entries: DestinationEntry[],
  maxShown: number,
  formatLine: (entry: DestinationEntry) => string,
  color: boolean
): void {
  if (entries.length === 0) {
    return;
  }

  lines.push(
    "",
    `    ${paint(color, "label", label)} ${paint(color, "dim", hint)}`
  );

  const shown = entries.slice(0, maxShown);
  for (const entry of shown) {
    lines.push(formatLine(entry));
  }
  const hidden = entries.length - shown.length;
  if (hidden > 0) {
    lines.push(`      ${paint(color, "dim", `... ${hidden} more`)}`);
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
    `  ${paint(color, "label", folder.targetDisplay)}`
  ];

  if (folder.promotable) {
    lines.push(
      `  ${paint(color, "ok", "Only dotfiles symlinks remain; ready to promote.")}`
    );
  } else if (folder.blockerCount > 0) {
    lines.push(
      `  ${paint(
        color,
        "warn",
        `${folder.blockerCount} local item${folder.blockerCount === 1 ? "" : "s"} block promoting this folder.`
      )}`
    );
  } else {
    lines.push(
      `  ${paint(color, "warn", "Package is not fully stowed under this folder.")}`
    );
  }

  const blockers = folder.entries.filter((entry) => entry.kind !== "stowed-symlink");
  const linked = folder.entries.filter((entry) => entry.kind === "stowed-symlink");

  appendEntrySection(
    lines,
    "local",
    "(not from dotfiles)",
    blockers,
    MAX_LOCAL_ENTRIES,
    (entry) => localEntryLine(entry, color),
    color
  );
  appendEntrySection(
    lines,
    "dotfiles",
    "(symlinked)",
    linked,
    MAX_LINKED_ENTRIES,
    (entry) => linkedEntryLine(entry, color),
    color
  );

  if (folder.promotable) {
    lines.push(
      "",
      `  ${paint(color, "dim", "Enter replaces per-file links with one directory symlink.")}`
    );
  } else if (folder.blockerCount > 0) {
    lines.push(
      "",
      `  ${paint(color, "warn", "Move or remove local items, then re-run dotfiles.")}`
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
    `${paint(color, "label", "dotfiles")} ${paint(color, "dim", "partial folders")}`,
    paint(
      color,
      "dim",
      "  per-file stow inside a real directory (not the folder symlink itself)"
    ),
    ""
  ];

  if (folders.length === 0) {
    lines.push(paint(color, "ok", "  no partial folders"));
  } else {
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]!;
      const marker = i === selected ? paint(color, "label", ">") : " ";
      const nameRole = i === selected ? "ok" : folder.promotable ? "path" : "warn";
      let suffix = "";
      if (folder.promotable) {
        suffix = paint(color, "dim", "  ready");
      } else if (folder.blockerCount > 0) {
        suffix = paint(
          color,
          "dim",
          `  (${folder.blockerCount} blocking)`
        );
      } else {
        suffix = paint(color, "dim", "  incomplete");
      }
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
