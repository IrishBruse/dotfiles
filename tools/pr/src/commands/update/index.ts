import { spawnSync } from "node:child_process";
import process from "node:process";

import {
  CURRENT_PR_SNAPSHOT_FILE,
  readAgentPrMarkdown,
} from "../../agentOutputFiles.ts";
import { populateReviewWorkspace } from "../../prepareReviewWorkspace.ts";
import {
  getGitRepoRoot,
  logAgentWorkspacePreamble,
  preparePrAgentWorkspace,
  readPrHeadBranchName,
} from "../../prAgentWorkspace.ts";
import { confirmAndApplyPrMetadata } from "../../prEditPostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrUpdateStub } from "../../noAgentPrStub.ts";
import {
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag,
} from "../../printPromptFlag.ts";
import { assertPrTitleMatchesJiraPolicy } from "../../jiraTitlePolicy.ts";
import { loadUpdateAgentPrompt } from "../agentPrompts.ts";

function resolveUpdatePrTarget(explicit: string | undefined): string {
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }
  const r = spawnSync("gh", ["pr", "view", "--json", "number"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() ||
      "gh pr view failed — pass a PR number/URL or open a PR from this branch";
    throw new Error(`pr update: ${msg}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    throw new Error("pr update: could not parse gh pr view JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { number: unknown }).number !== "number"
  ) {
    throw new Error("pr update: no PR number on this branch");
  }
  return String((parsed as { number: number }).number);
}

export function runUpdate(args: string[]): void {
  void runUpdateAsync(args).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}

async function runUpdateAsync(args: string[]): Promise<void> {
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
  let target: string;
  try {
    target = resolveUpdatePrTarget(rest[0]);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    return;
  }

  let workspaceDir: string;
  try {
    const repoRoot = getGitRepoRoot(process.cwd());
    const headBranch = readPrHeadBranchName(target);
    workspaceDir = preparePrAgentWorkspace(repoRoot, headBranch);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    return;
  }
  logAgentWorkspacePreamble(workspaceDir, printWorkspaceDir);

  try {
    await populateReviewWorkspace(workspaceDir, target, {
      snapshotPrToFile: CURRENT_PR_SNAPSHOT_FILE,
    });
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr update: failed to prefetch PR with gh: ${String(e)}`,
    );
    return;
  }

  const prompt = loadUpdateAgentPrompt({
    target,
    workspaceDir,
  });

  if (printPrompt) {
    console.log(prompt);
    return;
  }

  if (noAgent) {
    seedNoAgentPrUpdateStub(workspaceDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: workspaceDir, model });
    } catch (e) {
      failPrCli(
        e instanceof Error
          ? e.message
          : `pr update: agent failed: ${String(e)}`,
      );
      return;
    }
  }

  let parsed: ReturnType<typeof readAgentPrMarkdown>;
  try {
    parsed = readAgentPrMarkdown(workspaceDir, "pr update");
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr update: could not read agent output files: ${String(e)}`,
    );
    return;
  }

  try {
    assertPrTitleMatchesJiraPolicy(parsed.title);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    return;
  }

  await confirmAndApplyPrMetadata("pr update:", target, workspaceDir);
}
