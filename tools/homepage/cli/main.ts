import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const commands = ["dev", "build", "preview"] as const;

type Command = (typeof commands)[number];

function isCommand(value: string): value is Command {
  return (commands as readonly string[]).includes(value);
}

function printHelp(): void {
  console.log(`Local homepage dev server (Vite).

Usage:
  homepage [command]

Commands:
  dev       Start the dev server (default)
  build     Build for production
  preview   Preview the production build

Options:
  -h, --help  Show this help`);
}

function run(command: Command): void {
  const child = spawn("npm", ["run", command], {
    cwd: appRoot,
    stdio: "inherit",
    shell: true
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

const args = process.argv.slice(2);

if (args.length === 0) {
  run("dev");
} else if (args[0] === "-h" || args[0] === "--help") {
  printHelp();
} else if (args.length === 1 && isCommand(args[0])) {
  run(args[0]);
} else {
  console.error(`homepage: unknown args: ${args.join(" ")}`);
  printHelp();
  process.exit(1);
}
