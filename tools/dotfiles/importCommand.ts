import process from "node:process";

import { importDotfilePath, normalizeStowPath } from "./import.ts";
import { paint, printError, stdoutColorEnabled } from "./paint.ts";

function printImportHelp(): void {
  console.error(`dotfiles import - move paths from ~ into home/ for stowing

Usage:
  dotfiles import <path>...
  dotfiles import -h
  dotfiles import --help

Arguments:
  <path>    Stow-relative path (e.g. .zshrc, .config/fish) or path under ~

Examples:
  dotfiles import .zshrc
  dotfiles import ~/.config/fish
  dotfiles import .config/nvim/init.lua

Partial folders (some children already stowed) copy local entries into the
package and run stow for that folder. Plain paths are moved into home/; run
dotfiles stow afterward to link them back into ~.
`);
}

/**
 * Import one or more paths from ~ into home/.
 *
 * @param paths Raw path arguments from argv.
 * @return Exit code (0 on success, 1 on any failure).
 */
export function runDotfilesImport(paths: string[]): number {
  if (paths.some((arg) => arg === "-h" || arg === "--help")) {
    printImportHelp();
    return 0;
  }

  if (paths.length === 0) {
    printError("dotfiles import: missing path argument");
    printImportHelp();
    return 1;
  }

  const color = stdoutColorEnabled();
  let failed = false;

  for (const raw of paths) {
    const relPath = normalizeStowPath(raw);
    if (!relPath) {
      printError(`dotfiles import: invalid path ${raw}`);
      failed = true;
      continue;
    }

    const result = importDotfilePath(relPath);
    if (!result.ok) {
      printError(`dotfiles import: ~/${relPath}: ${result.error ?? "failed"}`);
      failed = true;
      continue;
    }

    if (result.mode === "partial") {
      if (result.imported.length > 0) {
        console.log(
          paint(color, "ok", `imported ${result.imported.length} into home/${relPath}`)
        );
        for (const name of result.imported) {
          console.log(paint(color, "path", `  ${name}`));
        }
      }
      if (result.linked.length > 0) {
        console.log(
          paint(color, "ok", `stowed ${result.linked.length} under ${relPath}`)
        );
      }
      if (result.imported.length === 0 && result.linked.length === 0) {
        console.log(paint(color, "dim", `no changes for home/${relPath}`));
      }
      continue;
    }

    console.log(
      paint(color, "ok", `moved ~/${relPath} -> home/${relPath}`)
    );
    console.log(paint(color, "dim", "run dotfiles stow to link"));
  }

  return failed ? 1 : 0;
}
