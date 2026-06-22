import process from "node:process";

import { runAdd } from "./addEntry.ts";
import { isCursorAgent } from "./agentGuard.ts";
import { parseGlobalFlag } from "./args.ts";
import { runInteractive } from "./browseEntries.ts";
import { runList } from "./listEntries.ts";
import { runView } from "./viewEntries.ts";
import { printError } from "./output.ts";

function printHelp(): void {
  console.error(`memory - persistent scoped agent lessons

Usage:
  memory [-g]
  memory add [-g] <id> <sentence> [--detail [content...]]
  memory view [-g] <id>

Commands:
  (none)  Browse local + global memories (raw markdown for agents)
  add     Append one high-level sentence linked to <id>
  view    Print one entry as raw markdown

Scope:
  ~/.agents/memory/repos/<repo>.json for ~/git/<repo>/...
  ~/.agents/memory/misc/<path>.json for other cwd (home, dotfiles, ...)
  -g, --global uses ~/.agents/memory/global.json

Options:
  -g, --global   Use global memory store only (list/view) or target (add)
  -h, --help     This help
  --detail       Reference markdown for <id> (arguments or stdin)
`);
}

function isInteractiveTty(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export async function main(argv: string[]): Promise<void> {
  const { rest: args, global } = parseGlobalFlag(argv.slice(2));

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.length === 0) {
    if (isCursorAgent()) {
      await runList({ cwd: process.cwd(), globalOnly: false });
      return;
    }
    if (isInteractiveTty()) {
      await runInteractive({ globalOnly: global });
      return;
    }
    await runList({ cwd: process.cwd(), globalOnly: global });
    return;
  }

  const [cmd, ...rest] = args;
  const { rest: cmdArgs, global: cmdGlobal } = parseGlobalFlag(rest);
  const useGlobal = cmdGlobal || global;

  if (cmd === "add") {
    await runAdd(cmdArgs, { global: useGlobal });
    return;
  }
  if (cmd === "view") {
    await runView(cmdArgs, { global: useGlobal });
    return;
  }

  printError(`Unknown command "${cmd}".`);
  printHelp();
  process.exit(1);
}

main(process.argv).catch((err) => {
  printError((err as Error).message);
  process.exit(1);
});
