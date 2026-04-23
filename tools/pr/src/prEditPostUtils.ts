import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { PrReviewJson } from "./parseJsonFence.ts";
import { failPrCli } from "./reviewPostUtils.ts";
import {
  printMarkdownPreview,
  waitForEnterRetryOrCancel,
  waitForPostOrCancel,
} from "./reviewPreview.ts";

export function noUpdateConfirmFromEnv(): boolean {
  return process.env.PR_UPDATE_NO_CONFIRM === "1";
}

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
  if (!noUpdateConfirmFromEnv()) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      failPrCli(
        `${logPrefix} need an interactive TTY to preview, or set PR_UPDATE_NO_CONFIRM=1`,
      );
      return;
    }
    printMarkdownPreview(parsed.title, parsed.body, { enterAction: "apply" });
    let choice: "post" | "cancel";
    try {
      choice = await waitForPostOrCancel("PR_UPDATE_NO_CONFIRM=1");
    } catch (e) {
      failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
      return;
    }
    if (choice === "cancel") {
      console.error(`${logPrefix} cancelled, not updating PR`);
      return;
    }
  } else {
    console.error(`${logPrefix} PR_UPDATE_NO_CONFIRM=1, applying without preview`);
  }

  const canRetry =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrMetadataEdit(target, parsed.title, parsed.body)) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      return;
    }
    const f = writePrUpdateFile(target, {
      ...parsed,
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
