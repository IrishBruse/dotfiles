import process from "node:process";

import { assertPrTitleMatchesJiraPolicy } from "./jiraTitlePolicy.ts";
import { getPrViewUrl, printPrUrlWithMargins } from "./prViewUrl.ts";
import { failPrCli, runGhWithBodyFile } from "./reviewPostUtils.ts";
import {
  confirmSubmitAfterEditorPreview,
  waitForEnterRetryOrCancel,
} from "./reviewPreview.ts";

export function postPrMetadataEdit(
  pr: string,
  title: string,
  body: string,
): boolean {
  return runGhWithBodyFile("pr-cli-edit-", body, (file) => [
    "pr",
    "edit",
    pr,
    "--title",
    title,
    "--body-file",
    file,
  ]);
}

export async function confirmAndApplyPrMetadata(
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

  try {
    assertPrTitleMatchesJiraPolicy(title);
  } catch (e) {
    failPrCli(e instanceof Error ? e.message : `${logPrefix} ${String(e)}`);
    return;
  }

  const canRetry =
    process.stdin.isTTY === true && process.stdout.isTTY === true;

  for (;;) {
    if (postPrMetadataEdit(target, title, body)) {
      const u = getPrViewUrl({ target });
      if (u) {
        printPrUrlWithMargins(u);
      }
      return;
    }
    console.error(
      `${logPrefix} could not run gh pr edit.\n` +
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
      console.error(`${logPrefix} not applied.`);
      process.exitCode = 1;
      return;
    }
  }
}
