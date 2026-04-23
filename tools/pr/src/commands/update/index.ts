import { spawnSync } from "node:child_process";
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
  confirmAndApplyPrMetadata,
  writePrUpdateFile,
} from "../../prEditPostUtils.ts";
import { failPrCli } from "../../reviewPostUtils.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import { assertPrTitleMatchesJiraPolicy } from "../create/work/jiraTitlePolicy.ts";
import { buildPrefetchedContextSection } from "../review/reviewPrompt.ts";
import {
  buildUpdatePrLine,
  loadUpdateAgentPrompt,
} from "./updatePrompt.ts";

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
    console.error(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    process.exitCode = 1;
  });
}

async function runUpdateAsync(args: string[]): Promise<void> {
  let target: string;
  try {
    target = resolveUpdatePrTarget(args[0]);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    return;
  }

  if (args.length > 1) {
    console.log("pr update: extra args (ignored):", args.slice(1).join(" "));
  }

  const workspaceDir = path.resolve(createReviewWorkspaceDir());
  console.error(`pr update: agent workspace: ${workspaceDir}`);

  try {
    populateReviewWorkspace(workspaceDir, target);
  } catch (e) {
    failPrCli(
      e instanceof Error
        ? e.message
        : `pr update: failed to prefetch PR with gh: ${String(e)}`,
    );
    return;
  }

  const prompt = loadUpdateAgentPrompt({
    prLine: buildUpdatePrLine(target),
    prefetchedContextSection: buildPrefetchedContextSection(workspaceDir),
    hintBlock: "",
  });

  let stdout: string;
  try {
    stdout = await runAgentPrint(prompt, { cwd: workspaceDir });
  } catch (e) {
    failPrCli(
      e instanceof Error ? e.message : `pr update: agent failed: ${String(e)}`,
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
        : `pr update: could not parse agent output: ${String(e)}`,
    );
    return;
  }

  try {
    assertPrTitleMatchesJiraPolicy(parsed.title);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `pr update: ${String(e)}`);
    return;
  }

  const outPath = writePrUpdateFile(target, parsed);
  console.error(
    `pr update: saved ${outPath} (title, body; re-apply with gh or edit file)`,
  );

  await confirmAndApplyPrMetadata("pr update:", target, parsed, workspaceDir);
}
