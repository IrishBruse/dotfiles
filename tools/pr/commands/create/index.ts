import process from "node:process";

import { runAgent } from "../../agent.ts";
import { getCurrentBranch, getRepoRoot } from "../../git.ts";
import { buildCreatePrompt } from "./prompt.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`pr create - run Cursor agent with the pr-create skill

Usage:
  pr create

Options:
  -h, --help   This message

Environment:
  WORK=true    Require NOVACORE-<ticket> title prefix (valid recent Jira ticket)
`);
    return;
  }

  if (args.length > 0) {
    fail(`pr create: unexpected arguments: ${args.join(" ")}`);
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

  const prompt = buildCreatePrompt(repoRoot, branch);

  try {
    await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
  }
}
