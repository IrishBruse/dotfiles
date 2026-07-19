import process from "node:process";

import { printHelp } from "./commands/help.ts";
import { runLint } from "./commands/lint.ts";
import { runLs } from "./commands/ls.ts";

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    printHelp();
    return;
  }

  const subcommand = args[0];

  if (subcommand === "lint") {
    const code = await runLint(args.slice(1));
    process.exit(code);
  }

  if (subcommand === "ls") {
    const code = await runLs(args.slice(1));
    process.exit(code);
  }

  printError(`unknown command "${subcommand}"`);
  printHelp();
  process.exit(1);
}

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  printError(message);
  process.exit(1);
});
