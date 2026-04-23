import process from "node:process";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import { populateCreateWorkspace } from "../../prepareCreateWorkspace.ts";
import {
  getGitRepoRoot,
  preparePrAgentWorkspace,
  readCurrentBranch,
} from "../../prAgentWorkspace.ts";
import { confirmAndCreatePr } from "../../prCreatePostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
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
  const { rest: a0, printPrompt } = takePrintPromptFlag(args);
  let rest: string[];
  let model: string;
  try {
    ({ rest, model } = takeModelFlags(a0));
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : String(e));
    return;
  }
  if (rest.length > 0) {
    console.log("pr create: extra args (ignored):", rest.join(" "));
  }
  console.error(`pr create: agent model: ${model}`);

  const repoRoot = getGitRepoRoot(process.cwd());
  const branchForWorkspace = readCurrentBranch(repoRoot);
  const workspaceDir = preparePrAgentWorkspace(repoRoot, branchForWorkspace);
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
    await runAgentPrint(prompt, { cwd: workspaceDir, model });
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

  await confirmAndCreatePr("pr create:", workspaceDir, repoRoot);
}
