import process from "node:process";

import { assertPrTitleMatchesJiraPolicy } from "./jiraTitlePolicy.ts";
import { getPrViewUrl, printPrUrlWithMargins } from "./prViewUrl.ts";
import { failPrCli, runGhWithBodyFile } from "./reviewPostUtils.ts";
import {
  confirmSubmitAfterEditorPreview,
  waitForEnterRetryOrCancel,
} from "./reviewPreview.ts";

export function postPrCreate(
  title: string,
  body: string,
  repoRoot: string,
): boolean {
  return runGhWithBodyFile(
    "pr-cli-create-",
    body,
    (file) => ["pr", "create", "--title", title, "--body-file", file],
    { cwd: repoRoot },
  );
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
      const u = getPrViewUrl({ cwd: repoRoot });
      if (u) {
        printPrUrlWithMargins(u);
      }
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
