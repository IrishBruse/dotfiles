import process from "node:process";

import { runAgent } from "../../agent.ts";
import { getCurrentBranch, getRepoRoot } from "../../git.ts";
import { buildUpdatePrompt } from "./prompt.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

export function runUpdate(args: string[]): void {
  void runUpdateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runUpdateAsync(args: string[]): Promise<void> {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`pr update - run Cursor agent with the pr-update skill

Usage:
  pr update [number|url]

Options:
  -h, --help   This message

Environment:
  WORK=true    Require NOVACORE-<ticket> title prefix (valid recent Jira ticket)
`);
    return;
  }

  const prTarget = args[0];
  if (args.length > 1) {
    fail(`pr update: unexpected arguments: ${args.slice(1).join(" ")}`);
    return;
  }

  const cwd = process.cwd();
  let repoRoot: string;
  let branch: string;
  try {
    repoRoot = getRepoRoot(cwd);
    branch = getCurrentBranch(repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  const prompt = buildUpdatePrompt(repoRoot, branch, prTarget);

  try {
    await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
  }
}
