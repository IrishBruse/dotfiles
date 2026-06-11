import process from "node:process";

import { runAgent } from "./agent.ts";
import { getRepoRoot, hasStagedChanges, resolveCwd } from "./git.ts";
import { parseCommitMessage } from "./message.ts";
import { buildCommitMsgPrompt, promptPathForHelp } from "./prompt.ts";

function printHelp(): void {
  console.error(`commit - generate a git commit message from staged changes

Usage:
  commit [options]

Options:
  --cwd <path>     Git repo directory (default: process.cwd())
  --prompt         Print expanded prompt to stdout and exit
  --dry            Run agent and print message (same as default; for testing)
  -h, --help       This help

Prompt:
  Bundled template: tools/commit/prompt.md (or prompt.md next to the installed command)
  Override: ~/.config/commit/prompt.md

Placeholders:
  {{cwd}} {{branch}} {{user}} {{stagedFiles}} {{stagedDiff}}

Agent runs in read-only ask mode (--mode ask).

Examples:
  commit
  commit --prompt
  commit --cwd ~/git/myapp
`);
}

function takeFlag(
  args: string[],
  flag: string
): { rest: string[]; on: boolean } {
  const on = args.includes(flag);
  const rest = on ? args.filter((a) => a !== flag) : args;
  return { rest, on };
}

function takeOptionalFlag(
  args: string[],
  flag: string
): { rest: string[]; value?: string } {
  const rest: string[] = [];
  let value: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === flag) {
      const next = args[++i];
      if (next === undefined || next.startsWith("-")) {
        throw new Error(`${flag} requires a value`);
      }
      value = next;
      continue;
    }
    if (arg.startsWith(`${flag}=`)) {
      value = arg.slice(flag.length + 1);
      continue;
    }
    rest.push(arg);
  }
  return { rest, value };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const cwdFlag = takeOptionalFlag(args, "--cwd");
  const { rest: a0, on: promptOnly } = takeFlag(cwdFlag.rest, "--prompt");
  const { rest, on: dry } = takeFlag(a0, "--dry");
  if (rest.length > 0) {
    fail(`commit: unexpected arguments: ${rest.join(" ")}`);
  }
  void dry;

  const gitCwd = resolveCwd(cwdFlag.value);
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(gitCwd);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  let prompt: string;
  try {
    prompt = buildCommitMsgPrompt(repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  if (promptOnly) {
    process.stdout.write(`${prompt}\n`);
    process.stderr.write(`commit: prompt from ${promptPathForHelp()}\n`);
    return;
  }

  if (!hasStagedChanges(gitCwd)) {
    return;
  }

  let agentOutput: string;
  try {
    agentOutput = await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
  }

  let message: string;
  try {
    message = parseCommitMessage(agentOutput);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  process.stdout.write(`${message}\n`);
}

main(process.argv).catch((err) => {
  console.error(`commit: ${(err as Error).message}`);
  process.exit(1);
});
