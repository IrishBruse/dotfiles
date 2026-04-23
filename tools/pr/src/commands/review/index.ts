import process from "node:process";
import path from "node:path";

import { readAgentTitleAndBody } from "../../agentOutputFiles.ts";
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
  const target = args[0];
  if (target === undefined) {
    failPrCli("pr review: expected a pull request URL or number");
    return;
  }
  if (args.length > 1) {
    console.log("pr review: extra args (ignored):", args.slice(1).join(" "));
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
    hintBlock: "",
  });

  try {
    await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof readAgentTitleAndBody>;
  try {
    parsed = readAgentTitleAndBody(workspaceDir, "pr review");
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
    `pr review: saved ${outPath} (copy of title/body; workspace still has Title.md & Body.md until posted)`,
  );

  await confirmAndPostReviewComment("pr review:", target, parsed, workspaceDir);
}
