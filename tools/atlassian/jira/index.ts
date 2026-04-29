#!/usr/bin/env node
/**
 * Jira CLI — view, sync, and initialize local Jira board.
 * Usage:
 *   jira [SKILL.md]            view board (default: jira-tickets skill)
 *   jira board [SKILL.md]      alias for above
 *   jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
 *   jira init [path]           create empty skill directory structure
 *   jira -h|--help             this message
 */
import process from "node:process";
import { run as runBoard } from "./board.ts";
import { run as runSync } from "./sync.ts";
import { run as runInit } from "./init.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira [SKILL.md]            view board (default: jira-tickets skill)
  jira board [SKILL.md]      alias for above
  jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
  jira init [path]           create empty skill directory structure
  jira -h|--help             this message
`);
}

function main() {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
    return;
  }
  if (arg === "sync") {
    process.exit(runSync());
  }
  if (arg === "init") {
    process.exit(runInit(process.argv[3]));
  }
  // "board" subcommand is optional — falls through to view
  const skillArg = arg === "board" ? process.argv[3] : arg;
  process.exit(runBoard(skillArg));
}

main();
