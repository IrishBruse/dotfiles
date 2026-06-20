import process from "node:process";

import { runAdd } from "./addEntry.ts";
import { isCursorAgent } from "./agentGuard.ts";
import { runInteractive } from "./browseEntries.ts";
import { runView } from "./viewEntries.ts";
import { printError } from "./output.ts";

function printHelp(): void {
  console.error(`memory - persistent agent lessons as a minimal skill

Usage:
  memory add <id> <sentence> [--detail [content...]]
  memory view <id>

Commands:
  add     Append one high-level sentence linked to <id>
  view    Print one entry as raw markdown

Options:
  -h, --help     This help
  --detail       Reference markdown for <id> (arguments or stdin)
`);
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  if (args.length === 0) {
    if (isCursorAgent()) {
      printHelp();
      return;
    }
    await runInteractive();
    return;
  }

  const [cmd, ...rest] = args;
  if (cmd === "add") {
    await runAdd(rest);
    return;
  }
  if (cmd === "view") {
    await runView(rest);
    return;
  }

  printError(`Unknown command "${cmd}".`);
  if (isCursorAgent()) {
    printHelp();
  }
  process.exit(1);
}

main(process.argv).catch((err) => {
  printError((err as Error).message);
  process.exit(1);
});
