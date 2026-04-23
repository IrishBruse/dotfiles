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

export function postPrCreate(
  title: string,
  body: string,
  repoRoot: string,
): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-create-"));
  const file = path.join(dir, "body.md");
  try {
    fs.writeFileSync(file, body, { encoding: "utf8" });
    const r = spawnSync(
      "gh",
      ["pr", "create", "--title", title, "--body-file", file],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        cwd: repoRoot,
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

export function prCreateJsonPath(): string {
  return path.join(process.cwd(), "pr-create.json");
}

type CreateSave = PrReviewJson & {
  lastError?: string;
};

export function writePrCreateFile(s: CreateSave): string {
  const f = prCreateJsonPath();
  const o: Record<string, unknown> = {
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

export async function confirmAndCreatePr(
  logPrefix: string,
  parsed: PrReviewJson,
  workspaceDir: string,
  repoRoot: string,
): Promise<void> {
  let title = parsed.title;
  let body = parsed.body;

  try {
    const out = await confirmSubmitAfterEditorPreview({
      logPrefix,
      initial: { title, body },
      actionDescription: "create this PR",
    });
    if (out === null) {
      console.error(`${logPrefix} cancelled, not creating PR`);
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
    if (postPrCreate(title, body, repoRoot)) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      return;
    }
    const f = writePrCreateFile({
      ...parsed,
      title,
      body,
      lastError: "gh pr create failed (non-zero exit or gh error)",
    });
    console.error(
      `${logPrefix} could not run gh pr create. Wrote: ${f}\n` +
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
      console.error(`${logPrefix} not created. Payload is still in ` + f);
      process.exitCode = 1;
      return;
    }
  }
}
