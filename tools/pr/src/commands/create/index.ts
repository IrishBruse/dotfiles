import fs from "node:fs";
import process from "node:process";

import { readAgentPrMarkdown } from "../../agentOutputFiles.ts";
import { fetchCreatePrefetchFiles } from "../../prepareCreateWorkspace.ts";
import {
  getGitRepoRoot,
  logAgentOutputDirPreamble,
  prepareAgentOutputDir,
  resolvePrCliGitCwd,
  resolvePrPromptDebugPath,
} from "../../prAgentWorkspace.ts";
import { confirmAndCreatePr } from "../../prCreatePostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrCreateStub } from "../../noAgentPrStub.ts";
import {
  takeAssumeYesFlag,
  takeDebugPromptFlag,
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag,
} from "../../printPromptFlag.ts";
import { assertPrTitleMatchesJiraPolicy } from "../../jiraTitlePolicy.ts";
import { loadCreateAgentPrompt } from "../agentPrompts.ts";

const PROMPT_ONLY_AGENT_DIR =
  "(not used: --print-prompt or --debug - no agent run)";

export function runCreate(args: string[]): void {
  void runCreateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runCreateAsync(args: string[]): Promise<void> {
  const { rest: a0, printPrompt } = takePrintPromptFlag(args);
  const { rest: a1, debugPrompt } = takeDebugPromptFlag(a0);
  const { rest: a2, noAgent } = takeNoAgentFlag(a1);
  const { rest: a3, assumeYes } = takeAssumeYesFlag(a2);
  const { rest: a4, printWorkspaceDir } = takePrintWorkspaceDirFlag(a3);
  let rest: string[];
  let model: string;
  try {
    ({ rest, model } = takeModelFlags(a4));
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : String(e));
    return;
  }
  if (rest.length > 0) {
    failPrCli(`pr create: unexpected arguments: ${rest.join(" ")}`);
    return;
  }

  const repoRoot = getGitRepoRoot(resolvePrCliGitCwd());

  let branch: string;
  let bundledFiles: Record<string, string>;
  try {
    ({ branch, files: bundledFiles } = fetchCreatePrefetchFiles(repoRoot));
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr create: failed to prepare context: ${String(e)}`,
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

  const prompt = loadCreateAgentPrompt({
    branch,
    repoRoot,
    agentOutputDir,
    bundledFiles,
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  if (debugPrompt) {
    const dest = resolvePrPromptDebugPath();
    fs.writeFileSync(dest, prompt, "utf8");
    console.error(`pr create: wrote prompt to ${dest}`);
    return;
  }

  if (noAgent) {
    seedNoAgentPrCreateStub(agentOutputDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: agentOutputDir, model });
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
    parsed = readAgentPrMarkdown(agentOutputDir, "pr create");
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

  await confirmAndCreatePr("pr create:", agentOutputDir, repoRoot, {
    skipEditorPreview: assumeYes,
    title: assumeYes ? parsed.title : undefined,
    body: assumeYes ? parsed.body : undefined,
  });
}
