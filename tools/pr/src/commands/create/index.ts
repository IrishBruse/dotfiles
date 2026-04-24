import process from "node:process";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import { populateCreateWorkspace } from "../../prepareCreateWorkspace.ts";
import {
  getGitRepoRoot,
  logAgentWorkspacePreamble,
  preparePrAgentWorkspace,
  readCurrentBranch,
  resolvePrCliGitCwd,
} from "../../prAgentWorkspace.ts";
import { confirmAndCreatePr } from "../../prCreatePostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrCreateStub } from "../../noAgentPrStub.ts";
import {
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag,
} from "../../printPromptFlag.ts";
import { assertPrTitleMatchesJiraPolicy } from "../../jiraTitlePolicy.ts";
import { loadCreateAgentPrompt } from "../agentPrompts.ts";

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
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
  const repoRoot = getGitRepoRoot(resolvePrCliGitCwd());
  const branchForWorkspace = readCurrentBranch(repoRoot);
  const workspaceDir = preparePrAgentWorkspace(repoRoot, branchForWorkspace);
  logAgentWorkspacePreamble(workspaceDir, printWorkspaceDir);

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

  const prompt = loadCreateAgentPrompt({
    branch,
    repoRoot,
    workspaceDir,
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  if (noAgent) {
    seedNoAgentPrCreateStub(workspaceDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: workspaceDir, model });
    } catch (e) {
      failPrCli(
        e instanceof Error
          ? e.message
          : `pr create: agent failed: ${String(e)}`,
      );
      return;
    }
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
