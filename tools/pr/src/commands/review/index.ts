import process from "node:process";

import { populateReviewWorkspace } from "../../prepareReviewWorkspace.ts";
import {
  logAgentWorkspacePreamble,
  preparePrReviewWorkspace,
} from "../../prAgentWorkspace.ts";
import {
  confirmAndPostReviewComment,
  failPrCli,
} from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrReviewStub } from "../../noAgentPrStub.ts";
import {
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag,
} from "../../printPromptFlag.ts";
import { loadReviewAgentPrompt } from "../agentPrompts.ts";

export function runReview(args: string[]): void {
  void runReviewAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runReviewAsync(args: string[]): Promise<void> {
  const { rest: a0, printPrompt } = takePrintPromptFlag(args);
  const { rest: a1, noAgent } = takeNoAgentFlag(a0);
  const { rest: a2, printWorkspaceDir } = takePrintWorkspaceDirFlag(a1);
  let rest: string[];
  let model: string;
  try {
    ({ rest, model } = takeModelFlags(a2));
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : String(e));
    return;
  }
  const target = rest[0];
  if (target === undefined) {
    failPrCli("pr review: expected a pull request URL or number");
    return;
  }
  let workspaceDir: string;
  try {
    workspaceDir = preparePrReviewWorkspace(target);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr review: ${String(e)}`);
    return;
  }
  logAgentWorkspacePreamble(workspaceDir, printWorkspaceDir);

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

  if (noAgent) {
    seedNoAgentPrReviewStub(workspaceDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: workspaceDir, model });
    } catch (e) {
      failPrCli(
        e instanceof Error
          ? e.message
          : `pr review: agent failed: ${String(e)}`,
      );
      return;
    }
  }

  await confirmAndPostReviewComment("pr review:", target, workspaceDir);
}
