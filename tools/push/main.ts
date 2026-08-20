import process from "node:process";

import { loadRules, planSlices } from "./config.ts";
import {
  commitSlices,
  hasUpstream,
  isAhead,
  isDirty,
  listChanges,
  pushBranch,
  repoRoot
} from "./git.ts";

function printHelp(): void {
  console.error(`push - split commits from commit.config.json, then push

Usage:
  push [options]
  just push [options]

Options:
  -p, --print      Show the plan without committing or pushing
  -h, --help       This message
`);
}

function fail(message: string): never {
  console.error(`push: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): { help: boolean; print: boolean } {
  let help = false;
  let print = false;
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "-p" || arg === "--print") {
      print = true;
      continue;
    }
    fail(`unexpected arguments (try push -h)`);
  }
  return { help, print };
}

function printPlan(
  slices: ReturnType<typeof planSlices>
): void {
  if (slices.length > 1) {
    console.error(`${String(slices.length)} commits\n`);
  }
  for (const [i, slice] of slices.entries()) {
    if (i > 0) {
      console.error("");
    }
    console.error(`#${String(i + 1)} ${slice.message}`);
    for (const path of slice.paths) {
      console.error(`  ${path}`);
    }
  }
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  if (args[0] !== undefined && !args[0].startsWith("-")) {
    fail(`unknown command "${args[0]}" (try push -h)`);
  }

  const opts = parseArgs(args);
  if (opts.help) {
    printHelp();
    return;
  }

  let root: string;
  try {
    root = repoRoot(process.cwd());
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  if (!isDirty(root)) {
    if (opts.print) {
      console.error("push: no changes");
      return;
    }
    if (isAhead(root) || !hasUpstream(root)) {
      try {
        pushBranch(root);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    }
    return;
  }

  const slices = planSlices(listChanges(root), loadRules(root));
  printPlan(slices);
  if (opts.print) {
    return;
  }

  try {
    commitSlices(root, slices);
    pushBranch(root);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

main(process.argv);
