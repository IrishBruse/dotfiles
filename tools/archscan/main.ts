/// <reference types="node" />
import process from "node:process";
import { runScan } from "./commands/scan/index.ts";
import { runEnrich } from "./commands/enrich/index.ts";

function printUsage(): void {
  console.log(`archscan — static analysis scanner for architecture data

Usage:
  archscan scan [dir] [output]       Scan codebase, write architecture-data.json
  archscan enrich [dir] [input]      Read scan data, compute derived metrics
  archscan [dir] [output]            Scan + enrich in one step
  archscan help                      Show this message

Commands:
  scan   Walk source files, collect LOC/exports/imports/fan-in/fan-out/adapters/tests
  enrich Read a scan JSON, add depth ratio, depth assessment, seam quality, pass-through flags
  (none) Run scan then enrich sequentially

Examples:
  archscan scan ./my-project
  archscan scan ./my-project ./.context/architecture-data.json
  archscan enrich ./my-project
  archscan ./my-project
`);
}

function takeFlag(args: string[], flag: string): { rest: string[]; on: boolean } {
  const on = args.includes(flag);
  const rest = on ? args.filter((a) => a !== flag) : args;
  return { rest, on };
}

export function main(argv: string[]): void {
  const [, , ...rawArgs] = argv;
  let args = rawArgs;

  const { rest: argsAfterHelp, on: helpRequested } = takeFlag(args, "--help");
  args = argsAfterHelp;
  if (helpRequested || args[0] === "help") {
    printUsage();
    return;
  }

  const command = args[0] === "scan" || args[0] === "enrich" ? args[0] : null;

  if (command === "scan") {
    void runScan(args.slice(1));
  } else if (command === "enrich") {
    void runEnrich(args.slice(1));
  } else {
    const dir = command !== null ? args[1] : args[0];
    const output = command !== null ? args[2] : args[1];
    void runScanAndEnrich(dir, output);
  }
}

async function runScanAndEnrich(dir: string | undefined, output: string | undefined): Promise<void> {
  const targetDir = dir ?? process.cwd();
  const outPath = output ?? `${targetDir}/.context/architecture-data.json`;

  await runScan([targetDir, outPath]);
  await runEnrich([targetDir, outPath, outPath]);
}

main(process.argv);
