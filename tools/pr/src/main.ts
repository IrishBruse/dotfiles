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
    inferAndRun(args.slice(1));
    return;
  }

  if (first === "--help" || first === "-h") {
    printHelp();
    return;
  }

  if (first === "--print-prompt") {
    if (args.length > 1) {
      console.error("pr: with no subcommand, only `--print-prompt` is allowed");
      process.exitCode = 1;
      return;
    }
    inferAndRun(["--print-prompt"]);
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
