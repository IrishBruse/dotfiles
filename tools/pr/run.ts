import process from "node:process";

import { runAgent } from "./agent.ts";
import { buildCreatePrompt } from "./commands/create/prompt.ts";
import { buildUpdatePrompt } from "./commands/update/prompt.ts";
import { resolvePrAction } from "./detect.ts";
import { getCurrentBranch, getRepoRoot } from "./git.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

export function runPr(args: string[]): void {
  void runPrAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runPrAsync(args: string[]): Promise<void> {
  const printOnly = args.includes("-p") || args.includes("--print");
  const positional = args.filter(
    (a) => a !== "-h" && a !== "--help" && a !== "-p" && a !== "--print"
  );
  if (positional.length > 1) {
    fail(`pr: unexpected arguments: ${positional.slice(1).join(" ")}`);
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

  const action = resolvePrAction(repoRoot, positional[0]);
  const prompt =
    action.mode === "create"
      ? buildCreatePrompt(repoRoot, branch)
      : buildUpdatePrompt(repoRoot, branch, action.prTarget);

  if (printOnly) {
    process.stdout.write(prompt);
    process.stdout.write("\n");
    return;
  }

  try {
    await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
  }
}
