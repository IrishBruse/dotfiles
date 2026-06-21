import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPartialPromoteInteractive } from "./interactive.ts";
import { parseStowOutput } from "./parse.ts";
import { printSummary } from "./summary.ts";
import type { StowAction, StowOptions } from "./types.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STOW_PACKAGE = "home";
const STOW_TARGET = homedir();

function stowFlag(action: StowAction): string {
  switch (action) {
    case "unstow":
      return "-D";
    case "restow":
      return "-R";
    default:
      return "-S";
  }
}

function stowArgs(options: StowOptions, verboseLevel: number): string[] {
  return [
    `-v${verboseLevel}`,
    "-d",
    REPO_ROOT,
    "-t",
    STOW_TARGET,
    "--dotfiles",
    STOW_PACKAGE,
    stowFlag(options.action)
  ];
}

export async function runDotfilesStow(options: StowOptions): Promise<number> {
  if (options.raw) {
    const result = spawnSync("stow", stowArgs(options, 3), { stdio: "inherit" });
    return result.status ?? 1;
  }

  const result = spawnSync("stow", stowArgs(options, 2), { encoding: "utf8" });
  const lines = (result.stderr ?? "").split("\n").filter((line) => line.length > 0);
  const summary = parseStowOutput(lines);

  const exitCode = printSummary(
    options.action,
    STOW_TARGET,
    summary,
    options.listUnchanged,
    result.status ?? 1
  );

  if (options.interactive && options.action === "stow") {
    const interactiveCode = await runPartialPromoteInteractive(options);
    if (interactiveCode !== 0) {
      return interactiveCode;
    }
  }

  return exitCode;
}
