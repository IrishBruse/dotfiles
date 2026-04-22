import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseLastJsonFence } from "../../parseJsonFence.ts";
import { runAgentPrint } from "../../runAgentPrint.ts";
import {
  printMarkdownPreview,
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
    console.error("pr review: running agent (print mode)…");
    stdout = await runAgentPrint(prompt);
  } catch (e) {
    fail(
      e instanceof Error ? e.message : `pr review: agent failed: ${String(e)}`,
    );
    return;
  }

  let parsed: ReturnType<typeof parseLastJsonFence>;
  try {
    parsed = parseLastJsonFence(stdout);
  } catch (e) {
    fail(
      e instanceof Error
        ? e.message
        : `pr review: could not parse agent output: ${String(e)}`,
    );
    return;
  }

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

  if (!postPrReviewComment(target, parsed.body)) {
    fail("pr review: gh pr review failed");
  }
}
