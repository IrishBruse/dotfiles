import process from "node:process";

import { runAdd } from "./addEntry.ts";
import { runList } from "./listEntries.ts";
import { runRef } from "./writeRef.ts";

function printHelp(): void {
  console.error(`memory - persistent agent lessons as a minimal skill

Usage:
  memory add <id> <sentence>
  memory ref <id> [detail...]
  memory list

Commands:
  add   Append one high-level sentence linked to <id>
  ref   Append detail to references/<id>.md (stdin accepted)
  list  Print entries for humans (alias: ls). Agents should read the skill.

Options:
  -h, --help     This help

Constraints:
  id must be kebab-case, at most 4 words separated by hyphens
  sentence must be a single line (max 120 chars)
  at most 20 inline entries (oldest dropped)
  duplicate ids are rejected

Examples:
  memory add deployment-migrations "Most deployment failures come from migration ordering."
  memory add checkout-redis "Checkout bugs often involve stale Redis entries."
  memory ref checkout-redis "Keys persist after session merge until TTL expires."
  memory list
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
  if (cmd === "ref") {
    await runRef(rest);
    return;
  }
  if (cmd === "list" || cmd === "ls") {
    await runList();
    return;
  }

  console.error(`memory: unknown command "${cmd}"`);
  printHelp();
  process.exit(1);
}

main(process.argv).catch((err) => {
  console.error(`memory: ${(err as Error).message}`);
  process.exit(1);
});
