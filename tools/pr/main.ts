/// <reference types="node" />

import process from "node:process";

import { printHelp } from "./commands/help.ts";
import { runPr } from "./run.ts";

export function main(argv: string[]): void {
  const args = argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  runPr(args);
}

main(process.argv);
