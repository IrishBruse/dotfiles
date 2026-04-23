import { spawnSync } from "node:child_process";
import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertPrTitleMatchesJiraPolicy } from "./jiraTitlePolicy.ts";
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

export async function confirmAndCreatePr(
  logPrefix: string,
  workspaceDir: string,
  repoRoot: string,
): Promise<void> {
  let title: string;
  let body: string;

  try {
    const out = await confirmSubmitAfterEditorPreview({
      logPrefix,
      workspaceDir,
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

  try {
    assertPrTitleMatchesJiraPolicy(title);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
    return;
  }

  const canRetry =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrCreate(title, body, repoRoot)) {
      return;
    }
    console.error(
      `${logPrefix} could not run gh pr create.\n` +
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
      console.error(`${logPrefix} not created.`);
      process.exitCode = 1;
      return;
    }
  }
}
