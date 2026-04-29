#!/usr/bin/env node
/**
 * Jira CLI — view, sync, and initialize local Jira board.
 * Usage:
 *   jira                       view board (default: jira-tickets skill)
 *   jira board                 alias for above
 *   jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
 *   jira init [path]           create empty skill directory structure
 *   jira pull <KEY|URL>        fetch a single ticket into references/misc
 *   jira -h|--help             this message
 */
import process from "node:process";
import { run as runBoard } from "./board.ts";
import { run as runSync } from "./sync.ts";
import { run as runInit } from "./init.ts";
import { run as runPull } from "./pull.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira                       view board (default: jira-tickets skill)
  jira board                 alias for above
  jira sync                  fetch Jira → skill markdown (needs CONFIG + acli)
  jira init [path]           create empty skill directory structure
  jira pull <KEY|URL>        fetch a single ticket into references/misc
  jira -h|--help             this message
`);
}

const JIRA_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/;
const JIRA_URL_RE = /^https?:\/\/[\w.-]+\/browse\/([A-Z][A-Z0-9_]*-\d+)/i;

function parseJiraKey(input: string): string | null {
  const keyMatch = input.match(JIRA_KEY_RE);
  if (keyMatch) return keyMatch[0];
  const urlMatch = input.match(JIRA_URL_RE);
  if (urlMatch) return urlMatch[1];
  return null;
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
