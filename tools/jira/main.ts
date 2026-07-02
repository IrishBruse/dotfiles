#!/usr/bin/env node
/**
 * Jira CLI — pull tickets to local markdown.
 * Usage:
 *   jira                       print help
 *   jira <KEY|URL>             fetch a single ticket into jira/<type>/ in cwd
 *   jira pull <KEY|URL>        same as above
 *   jira copy <KEY|URL> [dir]  copy ticket folder here or under dir (pull if missing locally)
 *   jira -h|--help             this message
 */
import process from "node:process";
import { run as runPull } from "./pull.ts";
import { run as runCopy } from "./copy.ts";
import { parseJiraKey } from "./jiraInput.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira                       print help
  jira <KEY|URL>             fetch a single ticket into jira/<type>/ in cwd
  jira pull <KEY|URL>        same as above
  jira copy <KEY|URL> [dir]  copy ticket folder here or under dir (pull if missing locally)
  jira -h|--help             this message
`);
}

function main() {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help" || !arg) {
    printHelp();
    process.exit(0);
    return;
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
  const key = parseJiraKey(arg);
  if (key) {
    process.exit(runPull(key));
  }
  console.error(`jira: unknown command or invalid ticket: ${arg}`);
  printHelp();
  process.exit(1);
}

main();
