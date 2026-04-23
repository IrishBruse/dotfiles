import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PrReviewJson } from "./agentOutputFiles.ts";
import { failPrCli } from "./reviewPostUtils.ts";
import {
  confirmSubmitAfterEditorPreview,
  waitForEnterRetryOrCancel,
} from "./reviewPreview.ts";

export function postPrMetadataEdit(
  pr: string,
  title: string,
  body: string,
): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-edit-"));
  const file = path.join(dir, "body.md");
  try {
    fs.writeFileSync(file, body, { encoding: "utf8" });
    const r = spawnSync(
      "gh",
      ["pr", "edit", pr, "--title", title, "--body-file", file],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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

export function prUpdateJsonPathFromTarget(target: string): string {
  const m = target.match(/(\d+)/);
  const id = m ? m[1]! : "pr";
  return path.join(process.cwd(), `pr-update-${id}.json`);
}

type UpdateSave = PrReviewJson & {
  lastError?: string;
};

export function writePrUpdateFile(pr: string, s: UpdateSave): string {
  const f = prUpdateJsonPathFromTarget(pr);
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

export async function confirmAndApplyPrMetadata(
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
      actionDescription: "update the PR on GitHub",
    });
    if (out === null) {
      console.error(`${logPrefix} cancelled, not updating PR`);
      return;
    }
    title = out.title;
    body = out.body;
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
    return;
  }

  const canRetry =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrMetadataEdit(target, title, body)) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      return;
    }
    const f = writePrUpdateFile(target, {
      ...parsed,
      title,
      body,
      lastError: "gh pr edit failed (non-zero exit or gh error)",
    });
    console.error(
      `${logPrefix} could not run gh pr edit. Wrote: ${f}\n` +
        "Fix the issue (e.g. run `gh auth login` or `gh repo set-default`), then " +
        (canRetry
          ? "press Enter to retry, or Esc to quit"
          : "re-run after fixing gh") +
        ".",
    );
    if (!canRetry) {
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
      console.error(`${logPrefix} not applied. Payload is still in ` + f);
      process.exitCode = 1;
      return;
    }
  }
}
