import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { findPromotableFolders, promotePartialFolder } from "./partial.ts";
import { paint, printError, stderrColorEnabled, stdoutColorEnabled } from "./paint.ts";
import { parseStowOutput } from "./parse.ts";
import type { StowOptions } from "./types.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STOW_PACKAGE = "home";
const STOW_TARGET = homedir();
const PACKAGE_ROOT = path.join(REPO_ROOT, STOW_PACKAGE);

const HELP_CONTROLS = "j/k up/down: move  Enter: promote  q/Esc: done";

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

function drawList(
  folders: string[],
  selected: number,
  stdout: NodeJS.WriteStream
): void {
  const color = stdoutColorEnabled();
  stdout.write("\x1b[?25l");
  stdout.write("\x1b[H\x1b[2J");
  stdout.write(
    `${paint(color, "label", "dotfiles")} ${paint(color, "dim", "promote partial folder to full directory symlink")}\n\n`
  );

  if (folders.length === 0) {
    stdout.write(paint(color, "ok", "  no partial folders left\n"));
  } else {
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]!;
      const marker = i === selected ? paint(color, "label", ">") : " ";
      const name =
        i === selected
          ? paint(color, "ok", folder)
          : paint(color, "path", folder);
      stdout.write(`  ${marker} ${name}\n`);
    }
  }

  stdout.write(`\n${paint(color, "dim", HELP_CONTROLS)}\n`);
  stdout.write("\x1b[?25h");
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
  let folders = findPromotableFolders(stowUnchangedPaths(), PACKAGE_ROOT, STOW_TARGET);

  if (folders.length === 0) {
    const color = stdoutColorEnabled();
    console.log(paint(color, "dim", "  no partial folders to promote"));
    return 0;
  }

  let selected = 0;
  let cleaned = false;

  const cleanup = (): void => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdin.pause();
    stdout.write("\x1b[?25h");
  };

  const finish = (): void => {
    cleanup();
    stdout.write("\n");
  };

  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  drawList(folders, selected, stdout);

  return await new Promise<number>((resolve) => {
    const onKeypress = (_str: string, key: readline.Key | undefined): void => {
      if (!key) {
        return;
      }

      if (key.ctrl && key.name === "c") {
        stdin.off("keypress", onKeypress);
        finish();
        resolve(130);
        return;
      }

      switch (key.name) {
        case "q":
        case "escape":
          stdin.off("keypress", onKeypress);
          finish();
          resolve(0);
          return;
        case "up":
        case "k":
          if (folders.length > 0) {
            selected = (selected - 1 + folders.length) % folders.length;
            drawList(folders, selected, stdout);
          }
          return;
        case "down":
        case "j":
          if (folders.length > 0) {
            selected = (selected + 1) % folders.length;
            drawList(folders, selected, stdout);
          }
          return;
        case "return": {
          const folderPath = folders[selected];
          if (!folderPath) {
            return;
          }
          const result = promotePartialFolder(
            folderPath,
            REPO_ROOT,
            STOW_PACKAGE,
            STOW_TARGET
          );
          const color = stdoutColorEnabled();
          const errColor = stderrColorEnabled();
          if (result.ok) {
            stdout.write(
              `\n${paint(color, "ok", `promoted ${folderPath}`)}\n`
            );
          } else {
            stdout.write(
              `\n${paint(errColor, "bad", `failed ${folderPath}: ${result.error ?? "unknown error"}`)}\n`
            );
          }
          folders = findPromotableFolders(
            stowUnchangedPaths(),
            PACKAGE_ROOT,
            STOW_TARGET
          );
          if (selected >= folders.length) {
            selected = Math.max(0, folders.length - 1);
          }
          drawList(folders, selected, stdout);
          return;
        }
        default:
          return;
      }
    };

    stdin.on("keypress", onKeypress);
  });
}
