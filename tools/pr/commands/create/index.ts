import process from "node:process";

import { markdown } from "../../../markdown/api.ts";
import { runAgent } from "../../agent.ts";
import { getRepoRoot, resolveGitCwd } from "../../git.ts";
import { buildPrCreatePrompt } from "../../prompt.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

function takeFlag(args: string[], flag: string): { rest: string[]; on: boolean } {
  const on = args.includes(flag);
  const rest = on ? args.filter((a) => a !== flag) : args;
  return { rest, on };
}

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`pr create - expand pr-create prompt, run Cursor agent, open PR

Options:
  --prompt         Print expanded prompt to stdout and exit
  --dry            Run agent only (no gh pr create)
  -h, --help       This message

Environment:
  PR_GIT_CWD       Git repo directory (default: cwd)
  WORK=true          Enable NOVACORE title rules in pr-create.md
`);
    return;
  }

  const { rest: a0, on: promptOnly } = takeFlag(args, "--prompt");
  const { rest, on: dry } = takeFlag(a0, "--dry");
  if (rest.length > 0) {
    fail(`pr create: unexpected arguments: ${rest.join(" ")}`);
    return;
  }

  const gitCwd = resolveGitCwd();
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(gitCwd);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  let prompt: string;
  try {
    prompt = buildPrCreatePrompt(repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  if (promptOnly) {
    process.stdout.write(markdown(prompt.trimEnd()));
    process.stdout.write("\n");
    return;
  }

  try {
    await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
    return;
  }

  if (dry) {
    return;
  }

  // TODO: parse final result JSON line and run gh pr create
}
