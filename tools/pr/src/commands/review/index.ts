import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getLastJsonFenceRaw,
  type PrReviewJson,
  parsePrReviewFromJsonString,
} from "../../parseJsonFence.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import {
  printMarkdownPreview,
  waitForEnterRetryOrCancel,
  waitForPostOrCancel,
} from "../../reviewPreview.ts";
import { buildWorkJiraTitleSection } from "../create/work/jiraTitlePolicy.ts";
import { buildPrLine, loadReviewAgentPrompt } from "./reviewPrompt.ts";

function noConfirmFromEnv(): boolean {
  return process.env.PR_REVIEW_NO_CONFIRM === "1";
}

function postPrReviewComment(pr: string, body: string): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-review-"));
  const file = path.join(dir, "body.md");
  try {
    fs.writeFileSync(file, body, { encoding: "utf8" });
    const r = spawnSync("gh", ["pr", "review", pr, "--comment", "-F", file], {
      stdio: "inherit",
    });
    return r.status === 0;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function fail(msg: string): void {
  console.error(msg);
  process.exitCode = 1;
}

function prReviewJsonPathFromTarget(target: string): string {
  const m = target.match(/(\d+)/);
  const id = m ? m[1]! : "pr";
  return path.join(process.cwd(), `pr-review-${id}.json`);
}

type ReviewSave = {
  agentResult: string;
  jsonFenceRaw: string;
  review: PrReviewJson;
  lastError?: string;
};

/** Save agent output and parsed review for offline re-post or after gh fix */
function writeReviewFile(pr: string, s: ReviewSave): string {
  const f = prReviewJsonPathFromTarget(pr);
  const o: Record<string, unknown> = {
    pr,
    savedAt: new Date().toISOString(),
    agentResult: s.agentResult,
    jsonFenceRaw: s.jsonFenceRaw,
    review: s.review,
  };
  if (s.lastError !== undefined) {
    o.lastError = s.lastError;
  }
  fs.writeFileSync(f, JSON.stringify(o, null, 2) + "\n", "utf8");
  return f;
}

export function runReview(args: string[]): void {
  void runReviewAsync(args).catch((e) => {
    console.error(
      e instanceof Error ? e.message : `pr review: ${String(e)}`,
    );
    process.exitCode = 1;
  });
}

async function runReviewAsync(args: string[]): Promise<void> {
  const target = args[0];
  if (target === undefined) {
    fail("pr review: expected a pull request URL or number");
    return;
  }
  if (args.length > 1) {
    console.log("pr review: extra args (ignored):", args.slice(1).join(" "));
  }

  const prompt = loadReviewAgentPrompt({
    prLine: buildPrLine(target),
    hintBlock: "",
    workJiraTitleSection: buildWorkJiraTitleSection(),
  });

  let stdout: string;
  try {
    console.error("pr review: running agent (stream-json)…");
    stdout = await runAgentPrint(prompt);
  } catch (e) {
    fail(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  let jsonFenceRaw: string;
  let parsed: PrReviewJson;
  try {
    jsonFenceRaw = getLastJsonFenceRaw(stdout);
    parsed = parsePrReviewFromJsonString(jsonFenceRaw);
  } catch (e) {
    fail(
      e instanceof Error
        ? e.message
        : `pr review: could not parse agent output: ${String(e)}`,
    );
    return;
  }

  const outPath = writeReviewFile(target, {
    agentResult: stdout,
    jsonFenceRaw,
    review: parsed,
  });
  console.error(
    `pr review: saved ${outPath} (agent result text, jsonFenceRaw, and review; re-post with gh or edit and paste body)`,
  );

  if (!noConfirmFromEnv()) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      fail(
        "pr review: need an interactive TTY to preview the comment, or set PR_REVIEW_NO_CONFIRM=1",
      );
      return;
    }
    printMarkdownPreview(parsed.title, parsed.body);
    let choice: "post" | "cancel";
    try {
      choice = await waitForPostOrCancel();
    } catch (e) {
      fail(
        e instanceof Error ? e.message : `pr review: ${String(e)}`,
      );
      return;
    }
    if (choice === "cancel") {
      console.error("pr review: cancelled, not posting");
      return;
    }
  } else {
    console.error("pr review: PR_REVIEW_NO_CONFIRM=1, posting without preview");
  }

  const canRetryPost =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrReviewComment(target, parsed.body)) {
      return;
    }
    const f = writeReviewFile(target, {
      agentResult: stdout,
      jsonFenceRaw,
      review: parsed,
      lastError: "gh pr review failed (non-zero exit or gh error)",
    });
    console.error(
      `pr review: could not post via gh. Wrote: ${f}\n` +
        "Fix the issue (e.g. run `gh auth login` or `gh repo set-default`), then " +
        (canRetryPost
          ? "press Enter to retry, or Esc to quit"
          : "re-run with the same PR after fixing gh") +
        ".",
    );
    if (!canRetryPost) {
      process.exitCode = 1;
      return;
    }
    let r: "retry" | "cancel";
    try {
      r = await waitForEnterRetryOrCancel();
    } catch (e) {
      fail(
        e instanceof Error ? e.message : `pr review: ${String(e)}`,
      );
      return;
    }
    if (r === "cancel") {
      console.error("pr review: not posted. Review is still in " + f);
      process.exitCode = 1;
      return;
    }
  }
}
