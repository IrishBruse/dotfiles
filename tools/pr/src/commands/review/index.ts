import process from "node:process";
import path from "node:path";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import {
  createReviewWorkspaceDir,
  populateReviewWorkspace,
} from "../../prepareReviewWorkspace.ts";
import {
  confirmAndPostReviewComment,
  failPrCli,
  writeReviewFile,
} from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takePrintPromptFlag } from "../../printPromptFlag.ts";
import {
  buildPrefetchedContextSection,
  buildPrLine,
  loadReviewAgentPrompt,
} from "./reviewPrompt.ts";

export function runReview(args: string[]): void {
  void runReviewAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : `pr review: ${String(e)}`);
    process.exitCode = 1;
  });
}

async function runReviewAsync(args: string[]): Promise<void> {
  const { rest, printPrompt } = takePrintPromptFlag(args);
  const target = rest[0];
  if (target === undefined) {
    failPrCli("pr review: expected a pull request URL or number");
    return;
  }
  if (rest.length > 1) {
    console.log("pr review: extra args (ignored):", rest.slice(1).join(" "));
  }

  const workspaceDir = path.resolve(createReviewWorkspaceDir());
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
    prLine: buildPrLine(target),
    prefetchedContextSection: buildPrefetchedContextSection(workspaceDir),
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  try {
    await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof readAgentPrMarkdown>;
  try {
    parsed = readAgentPrMarkdown(workspaceDir, "pr review");
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: could not read agent output files: ${String(e)}`,
    );
    return;
  }

  const outPath = writeReviewFile(target, parsed);
  console.error(
    `pr review: saved ${outPath} (backup copy; workspace PR.md removed after preview when you confirm)`,
  );

  await confirmAndPostReviewComment("pr review:", target, parsed, workspaceDir);
}
