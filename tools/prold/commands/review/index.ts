import fs from "node:fs";
import process from "node:process";

import { ghPrTitleBody } from "../../jiraPromptSection.ts";
import { loadPrAgentPrompt } from "../../loadPrPrompt.ts";
import {
  getGitRepoRoot,
  logAgentOutputDirPreamble,
  prepareAgentOutputDir,
  resolvePrCliGitCwd,
  resolvePrPromptDebugPath
} from "../../prAgentWorkspace.ts";
import {
  confirmAndPostReviewComment,
  failPrCli
} from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrReviewStub } from "../../noAgentPrStub.ts";
import {
  takeDebugPromptFlag,
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag
} from "../../printPromptFlag.ts";

const PROMPT_ONLY_AGENT_DIR =
  "(not used: --print-prompt or --debug - no agent run)";

export function runReview(args: string[]): void {
  void runReviewAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runReviewAsync(args: string[]): Promise<void> {
  const { rest: a0, printPrompt } = takePrintPromptFlag(args);
  const { rest: a1, debugPrompt } = takeDebugPromptFlag(a0);
  const { rest: a2, noAgent } = takeNoAgentFlag(a1);
  const { rest: a3, printWorkspaceDir } = takePrintWorkspaceDirFlag(a2);
  let rest: string[];
  let model: string;
  let reviewModelLabel: string;
  try {
    ({ rest, model, reviewModelLabel } = takeModelFlags(a3));
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : String(e));
    return;
  }
  const target = rest[0];
  if (target === undefined) {
    failPrCli("pr review: expected a pull request URL or number");
    return;
  }
  if (rest.length > 1) {
    failPrCli(`pr review: unexpected arguments: ${rest.slice(1).join(" ")}`);
    return;
  }

  const repoRoot = getGitRepoRoot(resolvePrCliGitCwd());
  let jiraTitle: string;
  let jiraBody: string;
  try {
    ({ title: jiraTitle, body: jiraBody } = ghPrTitleBody(target, repoRoot));
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: failed to read PR with gh: ${String(e)}`
    );
    return;
  }

  const promptOnly = printPrompt || debugPrompt;
  const agentOutputDir = promptOnly
    ? PROMPT_ONLY_AGENT_DIR
    : prepareAgentOutputDir();
  if (!promptOnly) {
    logAgentOutputDirPreamble(agentOutputDir, printWorkspaceDir);
  }

  let prompt: string;
  try {
    prompt = loadPrAgentPrompt({
      name: "pr-review",
      repoRoot,
      vars: { target, agentOutputDir, reviewModelLabel },
      jiraTitle,
      jiraBody
    });
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: failed to build prompt: ${String(e)}`
    );
    return;
  }

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  if (debugPrompt) {
    const dest = resolvePrPromptDebugPath();
    fs.writeFileSync(dest, prompt, "utf8");
    console.error(`pr review: wrote prompt to ${dest}`);
    return;
  }

  if (noAgent) {
    seedNoAgentPrReviewStub(agentOutputDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: agentOutputDir, model });
    } catch (e) {
      failPrCli(
        e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`
      );
      return;
    }
  }

  await confirmAndPostReviewComment("pr review:", target, agentOutputDir);
}
