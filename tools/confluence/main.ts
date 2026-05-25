#!/usr/bin/env node
import process from "node:process";
import { runClone } from "./clone.ts";

function printHelp(): void {
  process.stdout.write(`confluence — Confluence CLI (via acli)

Usage:
  confluence clone <confluencePageUrl> [outputDir]
  confluence clone --url <url> [--out|-o <dir>] [--acli <path>] [--raw-storage] [--concurrency|-j <n>]

Subcommands:
  clone   Clone a page subtree to local markdown (requires acli confluence auth)

Run \`confluence clone -h\` for clone options.
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === "-h" || cmd === "--help" || cmd === undefined) {
    printHelp();
    process.exit(cmd === undefined ? 1 : 0);
    return;
  }

  if (cmd === "clone") {
    if (argv[1] === "-h" || argv[1] === "--help") {
      await runClone(["-h"]);
      return;
    }
    await runClone(argv.slice(1));
    return;
  }

  console.error(`confluence: unknown subcommand: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
