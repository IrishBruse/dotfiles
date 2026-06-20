import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import { printError } from "./paint.ts";
import { runDotfilesStow } from "./stow.ts";
import type { StowAction, StowOptions } from "./types.ts";

const DOTFILES_ROOT = path.resolve(homedir(), "dotfiles");

function assertDotfilesCwd(): boolean {
  const cwd = path.resolve(process.cwd());
  if (cwd !== DOTFILES_ROOT) {
    printError(`dotfiles: must be run from ~/dotfiles (cwd: ${process.cwd()})`);
    return false;
  }
  return true;
}

function printHelp(): void {
  console.error(`dotfiles - stow dotfiles/home into ~ with a colored summary

Stow links individual paths from home/ (files or whole directories), not
parent folders when the target directory already exists.

Usage:
  dotfiles [options]

Options:
  -D, --delete     Unstow (remove symlinks)
  -R, --restow     Restow (unstow then stow)
  -v, --verbose    Show unchanged paths as a tree (dim nodes are grouping only)
  --raw            Print raw GNU stow output (-v 3)
  -h, --help       This help
`);
}

function parseOptions(argv: string[]): StowOptions | "help" | "error" {
  let action: StowAction = "stow";
  let listUnchanged = false;
  let raw = false;

  for (const arg of argv) {
    switch (arg) {
      case "-h":
      case "--help":
        return "help";
      case "-D":
      case "--delete":
        action = "unstow";
        break;
      case "-R":
      case "--restow":
        action = "restow";
        break;
      case "-v":
      case "--verbose":
        listUnchanged = true;
        break;
      case "--raw":
        raw = true;
        break;
      default:
        printError(`dotfiles: unknown option ${arg}`);
        printError("Try dotfiles --help");
        return "error";
    }
  }

  return { action, listUnchanged, raw };
}

export function main(argv: string[]): void {
  const parsed = parseOptions(argv.slice(2));

  if (parsed === "help") {
    printHelp();
    return;
  }

  if (parsed === "error") {
    process.exit(1);
  }

  if (!assertDotfilesCwd()) {
    process.exit(1);
  }

  process.exit(runDotfilesStow(parsed));
}

main(process.argv);
