#!/usr/bin/env node
/**
 * Jira CLI — pull tickets to local markdown and browse the `jira/` folder.
 */
import process from "node:process";
import { runJiraInteractive } from "./interactive.ts";
import { run as runPull, pullAll } from "./pull.ts";
import { pushAll, pushTicket } from "./push.ts";
import { parseJiraKey } from "./jiraInput.ts";
import { printError } from "./output.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira                       interactive browser for ./jira/ (TTY)
  jira <KEY|URL>             fetch a ticket (and optionally children) into jira/
  jira pull <KEY|URL>        same as above
  jira pull --all            re-pull every local ticket from Jira
  jira push <KEY>            push local ticket edits to Jira
  jira push --all            push every local ticket to Jira
  jira -h|--help             this message

Interactive keys:
  u pull selected   a pull all   s push selected   g push all   o open in browser
`);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    return;
  }
  if (!arg) {
    if (process.stdin.isTTY && process.stdout.isTTY) {
      process.exit(await runJiraInteractive());
      return;
    }
    printHelp();
    return;
  }
  if (arg === "pull") {
    const input = process.argv[3];
    if (!input) {
      printError("pull: missing ticket key or URL");
      process.exit(1);
    }
    if (input === "--all") {
      process.exit(pullAll());
    }
    const key = parseJiraKey(input);
    if (!key) {
      printError(`pull: not a valid Jira key or URL: ${input}`);
      process.exit(1);
    }
    process.exit(await runPull(key));
  }
  if (arg === "push") {
    const input = process.argv[3];
    if (!input) {
      printError("push: missing ticket key");
      process.exit(1);
    }
    if (input === "--all") {
      process.exit(pushAll());
    }
    const key = parseJiraKey(input);
    if (!key) {
      printError(`push: not a valid Jira key: ${input}`);
      process.exit(1);
    }
    process.exit(pushTicket(key));
  }
  const key = parseJiraKey(arg);
  if (key) {
    process.exit(await runPull(key));
  }
  printError(`unknown command or invalid ticket: ${arg}`);
  printHelp();
  process.exit(1);
}

main().catch((e) => {
  printError(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
