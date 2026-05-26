import process from "node:process";

import { runAgent } from "../../agent.ts";
import { printDrySection } from "../../dryRun.ts";
import { createPullRequest } from "../../ghCreate.ts";
import { getRepoRoot, resolveGitCwd } from "../../git.ts";
import { buildPrCreatePrompt } from "../../prompt.ts";
import { parsePrMarkdownFromAgentOutput } from "../../prMarkdown.ts";

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
  --print-prompt   Print expanded prompt to stdout and exit (no agent)
  --dry            Print prompt and agent response (no gh pr create)
  -h, --help       This message

Environment:
  PR_GIT_CWD       Git repo directory (default: cwd)
  PR_CLI_WORK=true Enable NOVACORE title rules in pr-create.md
`);
    return;
  }

  const { rest: a0, on: printPrompt } = takeFlag(args, "--print-prompt");
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

  if (printPrompt) {
    process.stdout.write(prompt);
    return;
  }

  if (dry) {
    printDrySection("prompt", prompt);
  }

  let agentOutput: string;
  try {
    agentOutput = await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
    return;
  }

  if (dry) {
    printDrySection("agent response", agentOutput);
    return;
  }

  let parsed;
  try {
    parsed = parsePrMarkdownFromAgentOutput(agentOutput);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  try {
    createPullRequest(repoRoot, parsed.title, parsed.body);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
}
