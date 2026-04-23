import process from "node:process";
import path from "node:path";

import { readAgentTitleAndBody } from "../../agentOutputFiles.ts";
import { createReviewWorkspaceDir } from "../../prepareReviewWorkspace.ts";
import { populateCreateWorkspace } from "../../prepareCreateWorkspace.ts";
import {
  confirmAndCreatePr,
  writePrCreateFile,
} from "../../prCreatePostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { assertPrTitleMatchesJiraPolicy } from "./work/jiraTitlePolicy.ts";
import {
  buildCreateBranchLine,
  buildCreatePrefetchedContextSection,
  loadCreateAgentPrompt,
} from "./createPrompt.ts";

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : `pr create: ${String(e)}`);
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
  if (args.length > 0) {
    console.log("pr create: extra args (ignored):", args.join(" "));
  }

  const repoRoot = path.resolve(process.cwd());
  const workspaceDir = path.resolve(createReviewWorkspaceDir());
  console.error(`pr create: agent workspace: ${workspaceDir}`);
  console.error(`pr create: repo (gh pr create cwd): ${repoRoot}`);

  let branch: string;
  try {
    branch = populateCreateWorkspace(workspaceDir, repoRoot);
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr create: failed to prepare workspace: ${String(e)}`,
    );
    return;
  }

  console.error(`pr create: branch: ${branch}`);

  const prompt = loadCreateAgentPrompt({
    branchLine: buildCreateBranchLine(branch),
    prefetchedContextSection: buildCreatePrefetchedContextSection(workspaceDir),
    hintBlock: "",
  });

  try {
    await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr create: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof readAgentTitleAndBody>;
  try {
    parsed = readAgentTitleAndBody(workspaceDir, "pr create");
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr create: could not read agent output files: ${String(e)}`,
    );
    return;
  }

  try {
    assertPrTitleMatchesJiraPolicy(parsed.title);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr create: ${String(e)}`);
    return;
  }

  const outPath = writePrCreateFile(parsed);
  console.error(
    `pr create: saved ${outPath} (copy of title/body; workspace still has Title.md & Body.md until create)`,
  );

  await confirmAndCreatePr("pr create:", parsed, workspaceDir, repoRoot);
}
