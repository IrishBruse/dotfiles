#!/usr/bin/env node
/**
 * Jira CLI — view, sync, and initialize local Jira board.
 * Usage:
 *   jira                       view board (default: jira-tickets skill)
 *   jira board                 alias for above
 *   jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
 *   jira init [path]           create empty skill directory structure
 *   jira pull <KEY|URL>        fetch a single ticket into references/misc
 *   jira copy <KEY|URL> [dir]  copy ticket folder here or under dir (pull if missing locally)
 *   jira -h|--help             this message
 */
import process from "node:process";
import { run as runBoard } from "./board.ts";
import { run as runSync } from "./sync.ts";
import { run as runInit } from "./init.ts";
import { run as runPull } from "./pull.ts";
import { run as runCopy } from "./copy.ts";
import { parseJiraKey } from "./jiraInput.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira                       view board (default: jira-tickets skill)
  jira board                 alias for above
  jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
  jira init [path]           create empty skill directory structure
  jira pull <KEY|URL>        fetch a single ticket into references/misc
  jira copy <KEY|URL> [dir]  copy ticket folder here or under dir (pull if missing locally)
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
  if (arg === "pull") {
    const input = process.argv[3];
    if (!input) {
      console.error("jira pull: missing ticket key or URL");
      process.exit(1);
    }
    const key = parseJiraKey(input);
    if (!key) {
      console.error(`jira pull: not a valid Jira key or URL: ${input}`);
      process.exit(1);
    }
    process.exit(runPull(key));
  }
  if (arg === "copy") {
    const input = process.argv[3];
    if (!input) {
      console.error("jira copy: missing ticket key or URL");
      process.exit(1);
    }
    process.exit(runCopy(input, process.argv[4]));
  }
  if (arg) {
    const key = parseJiraKey(arg);
    if (key) {
      process.exit(runPull(key));
    }
  }
  const code = runBoard();
  if (code !== -1) process.exit(code);
}

main();
