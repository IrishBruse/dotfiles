/// <reference types="node" />
import process from "node:process";
import { runFailure } from "./failure/failure.ts";

function printUsage(): void {
  console.log(`agent-tool — small helpers around agent workflows

Usage:
  agent-tool failure <summary...> [--skills a,b,c]
    Append one JSON line to ~/.agents/agent-failures.json

  --skills   Optional. Comma-separated skill names (from each skill's frontmatter name: field),
             most recently used first. Omit the flag if no skills applied.

Use failure after the user corrects a mistake so the log captures timestamp and cwd.

Examples:
  agent-tool failure used wrong import path for foo
  agent-tool failure "ignored repo AGENTS rule" --skills questions,agent-failures
`);
}

export function main(argv: string[]): void {
  const [, , cmd, ...rest] = argv;

  if (cmd === undefined || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printUsage();
    return;
  }

  if (cmd === "failure") {
    runFailure(rest);
    return;
  }

  console.error(`unknown command: ${cmd}`);
  printUsage();
  process.exitCode = 1;
}

main(process.argv);
