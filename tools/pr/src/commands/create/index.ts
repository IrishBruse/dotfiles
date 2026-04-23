import process from "node:process";
import path from "node:path";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import { createReviewWorkspaceDir } from "../../prepareReviewWorkspace.ts";
import { populateCreateWorkspace } from "../../prepareCreateWorkspace.ts";
import {
  confirmAndCreatePr,
  writePrCreateFile,
} from "../../prCreatePostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takePrintPromptFlag } from "../../printPromptFlag.ts";
import { assertPrTitleMatchesJiraPolicy } from "../../jiraTitlePolicy.ts";
import { loadCreateAgentPrompt } from "../agentPrompts.ts";

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : `pr create: ${String(e)}`);
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
  const { rest, printPrompt } = takePrintPromptFlag(args);
  if (rest.length > 0) {
    console.log("pr create: extra args (ignored):", rest.join(" "));
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
    branch,
    repoRoot,
    workspaceDir,
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  try {
    await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr create: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof readAgentPrMarkdown>;
  try {
    parsed = readAgentPrMarkdown(workspaceDir, "pr create");
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
    `pr create: saved ${outPath} (backup copy; workspace PR.md removed after preview when you confirm)`,
  );

  await confirmAndCreatePr("pr create:", parsed, workspaceDir, repoRoot);
}
