import process from "node:process";

import { runAdd } from "./addEntry.ts";
import { runList } from "./listEntries.ts";
import { printError } from "./output.ts";
import { runRm } from "./rmEntry.ts";
import { runShow } from "./show.ts";

function printHelp(): void {
  console.error(`memory - persistent agent lessons as a minimal skill

Usage:
  memory add <id> <sentence>
  memory show <id> [detail...]
  memory list
  memory rm

Commands:
  add   Append one high-level sentence linked to <id>
  show  Append detail to references/<id>.md (stdin accepted)
  list  Print entries for humans (alias: ls). Agents should read the skill.
  rm    Interactively pick and delete an entry (human-only)

Options:
  -h, --help     This help

Constraints:
  id must be kebab-case, at most 4 words separated by hyphens
  sentence must be a single line (max 120 chars)
  duplicate ids are rejected
  rm is blocked when CURSOR_AGENT is set (Cursor agent shell sessions)

Examples:
  memory add deployment-migrations "Most deployment failures come from migration ordering."
  memory add checkout-redis "Checkout bugs often involve stale Redis entries."
  memory show checkout-redis "Keys persist after session merge until TTL expires."
  memory list
  memory rm
`);
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const [cmd, ...rest] = args;
  if (cmd === "add") {
    await runAdd(rest);
    return;
  }
  if (cmd === "show") {
    await runShow(rest);
    return;
  }
  if (cmd === "list" || cmd === "ls") {
    await runList();
    return;
  }
  if (cmd === "rm") {
    await runRm(rest);
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
