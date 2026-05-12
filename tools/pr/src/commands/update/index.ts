import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

import {
  CURRENT_PR_SNAPSHOT_FILE,
  readAgentPrMarkdown,
} from "../../agentOutputFiles.ts";
import { fetchReviewPrefetchFiles } from "../../prepareReviewWorkspace.ts";
import {
  logAgentOutputDirPreamble,
  prepareAgentOutputDir,
  resolvePrPromptDebugPath,
} from "../../prAgentWorkspace.ts";
import { confirmAndApplyPrMetadata } from "../../prEditPostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { takeModelFlags } from "../../modelFlags.ts";
import { seedNoAgentPrUpdateStub } from "../../noAgentPrStub.ts";
import {
  takeDebugPromptFlag,
  takeNoAgentFlag,
  takePrintPromptFlag,
  takePrintWorkspaceDirFlag,
} from "../../printPromptFlag.ts";
import { assertPrTitleMatchesJiraPolicy } from "../../jiraTitlePolicy.ts";
import { loadUpdateAgentPrompt } from "../agentPrompts.ts";

const PROMPT_ONLY_AGENT_DIR =
  "(not used: --print-prompt or --debug - no agent run)";

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
      "gh pr view failed - pass a PR number/URL or open a PR from this branch";
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
  const { rest: a1, debugPrompt } = takeDebugPromptFlag(a0);
  const { rest: a2, noAgent } = takeNoAgentFlag(a1);
  const { rest: a3, printWorkspaceDir } = takePrintWorkspaceDirFlag(a2);
  let rest: string[];
  let model: string;
  try {
    ({ rest, model } = takeModelFlags(a3));
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
  if (rest.length > 1) {
    failPrCli(`pr update: unexpected arguments: ${rest.slice(1).join(" ")}`);
    return;
  }

  let bundledFiles: Record<string, string>;
  try {
    bundledFiles = await fetchReviewPrefetchFiles(target, {
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

  const promptOnly = printPrompt || debugPrompt;
  const agentOutputDir = promptOnly
    ? PROMPT_ONLY_AGENT_DIR
    : prepareAgentOutputDir();
  if (!promptOnly) {
    logAgentOutputDirPreamble(agentOutputDir, printWorkspaceDir);
  }

  const prompt = loadUpdateAgentPrompt({
    target,
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
    console.error(`pr update: wrote prompt to ${dest}`);
    return;
  }

  if (noAgent) {
    seedNoAgentPrUpdateStub(agentOutputDir);
  } else {
    try {
      await runAgentPrint(prompt, { cwd: agentOutputDir, model });
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
    parsed = readAgentPrMarkdown(agentOutputDir, "pr update");
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

  await confirmAndApplyPrMetadata("pr update:", target, agentOutputDir);
}
