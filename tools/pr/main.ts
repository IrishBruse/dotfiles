/// <reference types="node" />

import process from "node:process";

import { runCreate } from "./commands/create/index.ts";
import { runUpdate } from "./commands/update/index.ts";
import { printHelp } from "./commands/help.ts";

function printUnknown(command: string): void {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  const first = args[0];

  if (first === undefined || first === "--help" || first === "-h") {
    printHelp();
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
    default:
      printUnknown(first);
  }
}

main(process.argv);
