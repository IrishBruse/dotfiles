import process from "node:process";

import { runAgent } from "../../agent.ts";
import { createPullRequest } from "../../ghCreate.ts";
import { getRepoRoot, resolveGitCwd } from "../../git.ts";
import { buildPrCreatePrompt } from "../../prompt.ts";
import { parsePrMarkdownFromAgentOutput } from "../../prMarkdown.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

function takePrintPromptFlag(args: string[]): {
  rest: string[];
  printPrompt: boolean;
} {
  const printPrompt = args.includes("--print-prompt");
  const rest = printPrompt ? args.filter((a) => a !== "--print-prompt") : args;
  return { rest, printPrompt };
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
  -h, --help       This message

Environment:
  PR_GIT_CWD       Git repo directory (default: cwd)
  PR_CLI_WORK=true Enable NOVACORE title rules in pr-create.md
`);
    return;
  }

  const { rest, printPrompt } = takePrintPromptFlag(args);
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

  let agentOutput: string;
  try {
    agentOutput = await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
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
