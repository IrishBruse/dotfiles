import process from "node:process";
import path from "node:path";

import {
  getLastJsonFenceRaw,
  parsePrReviewFromJsonString,
} from "../../parseJsonFence.ts";
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
import { buildWorkJiraTitleSection } from "../create/work/jiraTitlePolicy.ts";
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
    populateReviewWorkspace(workspaceDir, target);
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
    workJiraTitleSection: buildWorkJiraTitleSection(),
  });

  let stdout: string;
  try {
    stdout = await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof parsePrReviewFromJsonString>;
  try {
    parsed = parsePrReviewFromJsonString(getLastJsonFenceRaw(stdout));
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr review: could not parse agent output: ${String(e)}`,
    );
    return;
  }

  const outPath = writeReviewFile(target, parsed);
  console.error(
    `pr review: saved ${outPath} (title, body; re-post with gh or edit and paste body)`,
  );

  await confirmAndPostReviewComment("pr review:", target, parsed, workspaceDir);
}
