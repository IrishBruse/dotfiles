import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { getPrViewUrl, printPrUrlWithMargins } from "./prViewUrl.ts";
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

export async function confirmAndPostReviewComment(
  logPrefix: string,
  target: string,
  workspaceDir: string,
): Promise<void> {
  let title: string;
  let body: string;

  try {
    const out = await confirmSubmitAfterEditorPreview({
      logPrefix,
      workspaceDir,
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
      const u = getPrViewUrl({ target });
      if (u) {
        printPrUrlWithMargins(u);
      }
      return;
    }
    console.error(
      `${logPrefix} could not post via gh.\n` +
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
      console.error(`${logPrefix} not posted.`);
      process.exitCode = 1;
      return;
    }
  }
}
