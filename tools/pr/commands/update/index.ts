import process from "node:process";

import { markdown } from "../../../markdown/api.ts";
import { runAgent } from "../../agent.ts";
import { editPullRequest } from "../../ghEdit.ts";
import { getRepoRoot, resolveGitCwd } from "../../git.ts";
import { buildPrUpdatePrompt } from "../../prompt.ts";
import { parsePrMarkdownFromAgentOutput } from "../../prMarkdown.ts";
import { resolvePrTarget } from "../../target.ts";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

function parseUpdateFlags(args: string[]): {
  rest: string[];
  promptOnly: boolean;
  dry: boolean;
} {
  const promptOnly = args.includes("--prompt");
  const dry = args.includes("--dry");
  const rest = args.filter((a) => a !== "--prompt" && a !== "--dry");
  return { rest, promptOnly, dry };
}

export function runUpdate(args: string[]): void {
  void runUpdateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runUpdateAsync(args: string[]): Promise<void> {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`pr update - expand pr-update prompt, run Cursor agent, edit PR

Usage:
  pr update [number|url]

Options:
  --prompt         Print expanded prompt to stdout and exit
  --dry            Run agent only (no gh pr edit); assumes a PR on this branch
  -h, --help       This message

Environment:
  PR_GIT_CWD       Git repo directory (default: cwd)
  WORK=true          Enable NOVACORE title rules in pr-update.md
`);
    return;
  }

  const { rest, promptOnly, dry } = parseUpdateFlags(args);

  const gitCwd = resolveGitCwd();
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(gitCwd);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  let target: string;
  try {
    target = resolvePrTarget(rest[0], repoRoot, { assumeExists: dry });
  } catch (e) {
    fail(`pr update: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  if (rest.length > 1) {
    fail(`pr update: unexpected arguments: ${rest.slice(1).join(" ")}`);
    return;
  }

  let prompt: string;
  try {
    prompt = buildPrUpdatePrompt(repoRoot, target);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  if (promptOnly) {
    process.stdout.write(markdown(prompt.trimEnd()));
    process.stdout.write("\n");
    return;
  }

  let agentOutput: string;
  try {
    agentOutput = await runAgent(prompt, repoRoot);
  } catch (e) {
    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
    return;
  }

  if (dry) {
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
    editPullRequest(repoRoot, target, parsed.title, parsed.body);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
}
