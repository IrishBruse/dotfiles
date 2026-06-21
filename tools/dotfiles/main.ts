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
  -i, --interactive
                   After stow, browse partial folders with a destination preview;
                   import local files into home/ or stow remainders; adopt ready
                   folders to full directory symlinks (TTY, stow only)
  --raw            Print raw GNU stow output (-v 3)
  -h, --help       This help
`);
}

function parseOptions(argv: string[]): StowOptions | "help" | "error" {
  let action: StowAction = "stow";
  let listUnchanged = false;
  let raw = false;
  let interactive = false;

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
      case "-i":
      case "--interactive":
        interactive = true;
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

  return { action, listUnchanged, raw, interactive };
}

export async function main(argv: string[]): Promise<void> {
  const parsed = parseOptions(argv.slice(2));

  if (parsed === "help") {
    printHelp();
    return;
  }

  if (parsed === "error") {
    process.exit(1);
  }

  if (parsed.interactive && parsed.action !== "stow") {
    printError("dotfiles: --interactive works with stow only (not -D or -R)");
    process.exit(1);
  }

  if (!assertDotfilesCwd()) {
    process.exit(1);
  }

  const code = await runDotfilesStow(parsed);
  process.exit(code);
}

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  printError(`dotfiles: ${message}`);
  process.exit(1);
});

