import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PrReviewJson } from "./agentOutputFiles.ts";
import {
  confirmSubmitAfterEditorPreview,
  waitForEnterRetryOrCancel,
} from "./reviewPreview.ts";

export function failPrCli(msg: string): void {
  console.error(msg);
  process.exitCode = 1;
}

export function postPrReviewComment(pr: string, body: string): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-review-"));
  const file = path.join(dir, "body.md");
  try {
    fs.writeFileSync(file, body, { encoding: "utf8" });
    const r = spawnSync("gh", ["pr", "review", pr, "--comment", "-F", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (r.status === 0) {
      return true;
    }
    if (r.stderr) {
      process.stderr.write(r.stderr);
    }
    if (r.stdout) {
      process.stdout.write(r.stdout);
    }
    return false;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export function prReviewJsonPathFromTarget(target: string): string {
  const m = target.match(/(\d+)/);
  const id = m ? m[1]! : "pr";
  return path.join(process.cwd(), `pr-review-${id}.json`);
}

type ReviewSave = PrReviewJson & {
  lastError?: string;
};

export function writeReviewFile(pr: string, s: ReviewSave): string {
  const f = prReviewJsonPathFromTarget(pr);
  const o: Record<string, unknown> = {
    pr,
    savedAt: new Date().toISOString(),
    title: s.title,
    body: s.body,
  };
  if (s.lastError !== undefined) {
    o.lastError = s.lastError;
  }
  fs.writeFileSync(f, JSON.stringify(o, null, 2) + "\n", "utf8");
  return f;
}

export async function confirmAndPostReviewComment(
  logPrefix: string,
  target: string,
  parsed: PrReviewJson,
  workspaceDir: string,
): Promise<void> {
  let title = parsed.title;
  let body = parsed.body;

  try {
    const out = await confirmSubmitAfterEditorPreview({
      logPrefix,
      initial: { title, body },
      actionDescription: "post this review comment",
    });
    if (out === null) {
      console.error(`${logPrefix} cancelled, not posting`);
      return;
    }
    title = out.title;
    body = out.body;
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
    return;
  }

  const canRetryPost =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrReviewComment(target, body)) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      return;
    }
    const f = writeReviewFile(target, {
      ...parsed,
      title,
      body,
      lastError: "gh pr review failed (non-zero exit or gh error)",
    });
    console.error(
      `${logPrefix} could not post via gh. Wrote: ${f}\n` +
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
      failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
      return;
    }
    if (r === "cancel") {
      console.error(`${logPrefix} not posted. Review is still in ` + f);
      process.exitCode = 1;
      return;
    }
  }
}
