/// <reference types="node" />

import process from "node:process";

import { runCreate } from "./commands/create/index.ts";
import { runUpdate } from "./commands/update/index.ts";
import { runReview } from "./commands/review/index.ts";
import { printHelp } from "./commands/help.ts";
import { inferAndRun } from "./infer.ts";

function printUnknown(command: string): void {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  const first = args[0];

  if (first === undefined) {
    inferAndRun([]);
    return;
  }

  if (first === "--help" || first === "-h") {
    printHelp();
    return;
  }

  const inferOnlyFlags = new Set([
    "--print-prompt",
    "--no-agent",
    "--opus",
    "--codex",
  ]);
  if (args.length > 0 && args.every((a) => inferOnlyFlags.has(a))) {
    inferAndRun(args);
    return;
  }

  const rest = args.slice(1);

  switch (first) {
    case "create":
      runCreate(rest);
      return;
    case "update":
      runUpdate(rest);
      return;
    case "review":
      runReview(rest);
      return;
    default:
      printUnknown(first);
  }
}

main(process.argv);
