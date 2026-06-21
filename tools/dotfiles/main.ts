import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import { runInteractiveCommand } from "./interactiveCommand.ts";
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
  dotfiles stow [options]
  dotfiles unstow [options]
  dotfiles restow [options]

Commands:
  (default)        Browse partial folders (TTY, preview); S to stow, then import,
                   stow remainders, or adopt ready folders
  stow             Stow only (no interactive browser)
  unstow           Remove stow symlinks
  restow           Unstow then stow

Options (stow, unstow, restow):
  -v, --verbose    Show unchanged paths as a tree (dim nodes are grouping only)
  --raw            Print raw GNU stow output (-v 3)
  -h, --help       This help
`);
}

function parseDisplayOptions(argv: string[]): Omit<StowOptions, "action"> | "help" | "error" {
  let listUnchanged = false;
  let raw = false;

  for (const arg of argv) {
    switch (arg) {
      case "-h":
      case "--help":
        return "help";
      case "-D":
      case "--delete":
        printError("dotfiles: use dotfiles unstow (not -D)");
        return "error";
      case "-R":
      case "--restow":
        printError("dotfiles: use dotfiles restow (not -R)");
        return "error";
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

  return { listUnchanged, raw };
}

async function runInteractive(args: string[]): Promise<void> {
  const parsed = parseDisplayOptions(args);
  if (parsed === "help") {
    printHelp();
    return;
  }
  if (parsed === "error") {
    process.exit(1);
  }
  if (parsed.listUnchanged || parsed.raw) {
    printError("dotfiles: options other than -h require dotfiles stow, unstow, or restow");
    process.exit(1);
  }
  if (!assertDotfilesCwd()) {
    process.exit(1);
  }
  const code = await runInteractiveCommand();
  process.exit(code);
}

async function runStowAction(action: StowAction, args: string[]): Promise<void> {
  const parsed = parseDisplayOptions(args);
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
  const code = await runDotfilesStow({ ...parsed, action });
  process.exit(code);
}

const STOW_ACTION_COMMANDS: Record<string, StowAction> = {
  stow: "stow",
  unstow: "unstow",
  restow: "restow"
};

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  if (args.length === 0) {
    await runInteractive([]);
    return;
  }

  const subcommand = args[0];

  if (subcommand === "-h" || subcommand === "--help") {
    printHelp();
    return;
  }

  const action = STOW_ACTION_COMMANDS[subcommand];
  if (action) {
    await runStowAction(action, args.slice(1));
    return;
  }

  if (subcommand.startsWith("-")) {
    await runInteractive(args);
    return;
  }

  printError(`dotfiles: unknown subcommand ${subcommand}`);
  printError("Try dotfiles --help");
  process.exit(1);
}

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  printError(`dotfiles: ${message}`);
  process.exit(1);
});
