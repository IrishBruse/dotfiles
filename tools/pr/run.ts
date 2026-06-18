import process from "node:process";

import { runAgent } from "./agent.ts";
import { buildCreatePrompt } from "./commands/create/prompt.ts";
import { buildFixPrompt } from "./commands/fix/prompt.ts";
import { buildUpdatePrompt } from "./commands/update/prompt.ts";
import { resolvePrAction } from "./detect.ts";
import { getCurrentBranch, getRepoRoot } from "./git.ts";
function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

type ParsedArgs = {
  printOnly: boolean;
  mode: "create-update" | "fix";
  prTarget?: string;
};

function parseArgs(args: string[]): ParsedArgs | "error" {
  const printOnly = args.includes("-p") || args.includes("--print");
  const positional = args.filter(
    (a) => a !== "-h" && a !== "--help" && a !== "-p" && a !== "--print"
  );

  if (positional[0] === "fix") {
    if (positional.length > 2) {
      return "error";
    }
    return {
      printOnly,
      mode: "fix",
      prTarget: positional[1]
    };
  }

  if (positional.length > 1) {
    return "error";
  }

  return {
    printOnly,
    mode: "create-update",
    prTarget: positional[0]
  };
}

export function runPr(args: string[]): void {
  void runPrAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runPrAsync(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  if (parsed === "error") {
    fail("pr: unexpected arguments (try pr -h)");
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

  if (parsed.mode === "fix") {
    await runFix(repoRoot, branch, parsed.prTarget, parsed.printOnly);
    return;
  }

  const action = resolvePrAction(repoRoot, parsed.prTarget);
  const prompt =
    action.mode === "create"
      ? buildCreatePrompt(repoRoot, branch)
      : buildUpdatePrompt(repoRoot, branch, action.prTarget);

  if (parsed.printOnly) {
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

async function runFix(
  repoRoot: string,
  branch: string,
  prTarget: string | undefined,
  printOnly: boolean
): Promise<void> {
  const { prompt, failures, unresolvedThreads } = buildFixPrompt(
    repoRoot,
    branch,
    prTarget
  );

  if (printOnly) {
    process.stdout.write(prompt);
    process.stdout.write("\n");
    return;
  }

  if (failures.length === 0 && unresolvedThreads.length === 0) {
    console.error(
      "pr fix: all checks passing and no unresolved review comments"
    );
    return;
  }

  try {
    await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
  }
}
