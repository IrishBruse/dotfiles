import process from "node:process";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import { populateReviewWorkspace } from "../../prepareReviewWorkspace.ts";
import {
  getGitRepoRoot,
  preparePrAgentWorkspace,
  readPrHeadBranchName,
} from "../../prAgentWorkspace.ts";
import {
  confirmAndPostReviewComment,
  failPrCli,
} from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { takePrintPromptFlag } from "../../printPromptFlag.ts";
import { loadReviewAgentPrompt } from "../agentPrompts.ts";

export function runReview(args: string[]): void {
  void runReviewAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : `pr review: ${String(e)}`);
    process.exitCode = 1;
  });
}

async function runReviewAsync(args: string[]): Promise<void> {
  const { rest: a0, printPrompt } = takePrintPromptFlag(args);
  let rest: string[];
  let model: string;
  try {
    ({ rest, model } = takeModelFlags(a0));
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : String(e));
    return;
  }
  const target = rest[0];
  if (target === undefined) {
    failPrCli("pr review: expected a pull request URL or number");
    return;
  }
  console.error(`pr review: agent model: ${model}`);
  if (rest.length > 1) {
    console.log("pr review: extra args (ignored):", rest.slice(1).join(" "));
  }

  let workspaceDir: string;
  try {
    const repoRoot = getGitRepoRoot(process.cwd());
    const headBranch = readPrHeadBranchName(target);
    workspaceDir = preparePrAgentWorkspace(repoRoot, headBranch);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr review: ${String(e)}`);
    return;
  }
  console.error(`pr review: agent workspace: ${workspaceDir}`);

  try {
    await populateReviewWorkspace(workspaceDir, target);
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: failed to prefetch PR with gh: ${String(e)}`,
    );
    return;
  }

  const prompt = loadReviewAgentPrompt({
    target,
    workspaceDir,
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  try {
    await runAgentPrint(prompt, { cwd: workspaceDir, model });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  try {
    readAgentPrMarkdown(workspaceDir, "pr review");
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: could not read agent output files: ${String(e)}`,
    );
    return;
  }

  await confirmAndPostReviewComment("pr review:", target, workspaceDir);
}
