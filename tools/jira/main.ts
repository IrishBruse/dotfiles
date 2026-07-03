#!/usr/bin/env node
/**
 * Jira CLI — pull tickets to local markdown and browse the `jira/` folder.
 */
import process from "node:process";
import { run as runBoardSync } from "../../dashboard/jira-sync.ts";
import { runJiraInteractive } from "./interactive.ts";
import { run as runPull, pullAll } from "./pull.ts";
import { pushAll, pushTicket } from "./push.ts";
import { run as runCopy } from "./copy.ts";
import { parseJiraKey } from "./jiraInput.ts";
import { printError } from "./output.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  jira                       interactive browser for ./jira/ (TTY)
  jira <KEY|URL>             fetch a ticket (and optionally children) into jira/
  jira pull <KEY|URL>        same as above
  jira pull --all            re-pull every local ticket from Jira
  jira sync                  same as jira pull --all
  jira board sync            sync Jira board into ~/.agents/skills/jira-board/
  jira push <KEY>            push local ticket edits to Jira
  jira push --all            push every local ticket to Jira
  jira copy <KEY|URL> [dir]  copy ticket folder here or under dir
  jira -h|--help             this message

Interactive keys:
  u pull selected   a pull all (jira sync)   s push selected   g push all   o open in browser
`);
}

async function main(): Promise<void> {
  if (process.env.CURSOR_AGENT === "1") {
    printError("this tool is not to be used by an agent");
    process.exit(1);
  }
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
  if (arg === "sync") {
    process.exit(await pullAll());
  }
  if (arg === "board") {
    const sub = process.argv[3];
    if (sub === "sync") {
      process.exit(runBoardSync());
    }
    printError("board: unknown subcommand (try: sync)");
    process.exit(1);
  }
  if (arg === "pull") {
    const input = process.argv[3];
    if (!input) {
      printError("pull: missing ticket key or URL");
      process.exit(1);
    }
    if (input === "--all") {
      process.exit(await pullAll());
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
  if (arg === "copy") {
    const input = process.argv[3];
    if (!input) {
      printError("copy: missing ticket key or URL");
      process.exit(1);
    }
    process.exit(runCopy(input, process.argv[4]));
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
