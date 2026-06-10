import { fstatSync } from "node:fs";
import process from "node:process";

import { logIncident } from "./logIncident.ts";
import { incidentFileName } from "./paths.ts";

function printHelp(): void {
  console.error(`failure - append agent incidents to markdown logs

Usage:
  failure log <title> [options]
  failure log <title> <detail...>

Options:
  --cwd <path>           Repo context (default: process.cwd())
  --detail <text>        Incident body (repeatable)
  --resolution <text>    How it was fixed or worked around
  -h, --help             This help

Routing:
  cwd under ~/git/<name>/ -> ~/.agents/skills/failure/logs/<name>.md
  otherwise               -> ~/.agents/skills/failure/logs/misc.md

Examples:
  failure log "validate failed on missing types" --detail "tsc complained about archscan/api.ts"
  failure log "wrong API assumption" --resolution "read api.ts before editing consumers"
`);
}

function takeFlag(
  args: string[],
  flag: string
): { rest: string[]; values: string[] } {
  const rest: string[] = [];
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === flag) {
      const value = args[++i];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${flag} requires a value`);
      }
      values.push(value);
      continue;
    }
    if (arg.startsWith(`${flag}=`)) {
      values.push(arg.slice(flag.length + 1));
      continue;
    }
    rest.push(arg);
  }
  return { rest, values };
}

function takeOptionalFlag(
  args: string[],
  flag: string
): { rest: string[]; value?: string } {
  const { rest, values } = takeFlag(args, flag);
  return { rest, value: values[0] };
}

function stdinIsPiped(): boolean {
  if (process.stdin.isTTY) {
    return false;
  }
  try {
    return fstatSync(process.stdin.fd).isFIFO();
  } catch {
    return false;
  }
}

async function readStdin(): Promise<string> {
  if (!stdinIsPiped()) {
    return "";
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function runLog(args: string[]): Promise<void> {
  let rest = args;
  const cwdFlag = takeOptionalFlag(rest, "--cwd");
  rest = cwdFlag.rest;
  const detailFlag = takeFlag(rest, "--detail");
  rest = detailFlag.rest;
  const resolutionFlag = takeOptionalFlag(rest, "--resolution");
  rest = resolutionFlag.rest;

  if (rest.length === 0) {
    throw new Error("failure log: title is required");
  }

  const [title, ...detailPositional] = rest;
  const stdin = await readStdin();
  const detailParts = [
    ...detailFlag.values,
    ...detailPositional,
    stdin
  ].filter((part) => part.trim().length > 0);

  const cwd = cwdFlag.value ?? process.cwd();
  const filePath = await logIncident({
    cwd,
    title: title!,
    detail: detailParts.join("\n\n"),
    resolution: resolutionFlag.value
  });

  console.log(filePath);
  console.error(`failure: appended to ${incidentFileName(cwd)}`);
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const [cmd, ...rest] = args;
  if (cmd === "log") {
    await runLog(rest);
    return;
  }

  console.error(`failure: unknown command "${cmd}"`);
  printHelp();
  process.exit(1);
}

main(process.argv).catch((err) => {
  console.error(`failure: ${(err as Error).message}`);
  process.exit(1);
});
