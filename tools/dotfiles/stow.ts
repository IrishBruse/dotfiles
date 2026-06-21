import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseStowOutput } from "./parse.ts";
import { printSummary } from "./summary.ts";
import type { StowAction, StowOptions, StowSummary } from "./types.ts";

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

function stowArgs(options: StowOptions, verboseLevel: number, dryRun = false): string[] {
  const args = [
    `-v${verboseLevel}`,
    "-d",
    REPO_ROOT,
    "-t",
    STOW_TARGET,
    "--dotfiles",
    STOW_PACKAGE,
    stowFlag(options.action)
  ];
  if (dryRun) {
    args.unshift("-n");
  }
  return args;
}

/** Parsed result of a stow invocation. */
export interface StowResult {
  summary: StowSummary;
  status: number;
}

/**
 * Run stow and parse -v2 stderr.
 *
 * @param dryRun When true, pass -n so stow plans without changing the filesystem.
 * @return Parsed summary and stow exit status.
 */
export function queryDotfilesStow(dryRun: boolean): StowResult {
  const options: StowOptions = { action: "stow", listUnchanged: false, raw: false };
  const result = spawnSync("stow", stowArgs(options, 2, dryRun), { encoding: "utf8" });
  const lines = (result.stderr ?? "").split("\n").filter((line) => line.length > 0);
  return { summary: parseStowOutput(lines), status: result.status ?? 1 };
}

export async function runDotfilesStow(options: StowOptions): Promise<number> {
  if (options.raw) {
    const result = spawnSync("stow", stowArgs(options, 3), { stdio: "inherit" });
    return result.status ?? 1;
  }

  const result = spawnSync("stow", stowArgs(options, 2), { encoding: "utf8" });
  const lines = (result.stderr ?? "").split("\n").filter((line) => line.length > 0);
  const summary = parseStowOutput(lines);

  return printSummary(
    options.action,
    STOW_TARGET,
    summary,
    options.listUnchanged,
    result.status ?? 1
  );
}
