import fs from "node:fs";
import path from "node:path";

import { buildPreviewMarkdown, MERGED_PREVIEW_FILE } from "./agentOutputFiles.ts";
import { isPrCliWork, PR_WORK_JIRA_KEY } from "./jiraTitlePolicy.ts";

/**
 * `pr create --no-agent`: there is no prefetched `PR.md`; write a placeholder so
 * {@link readAgentPrMarkdown} and the editor step can run.
 */
export function seedNoAgentPrCreateStub(workspaceDir: string): void {
  const title = isPrCliWork()
    ? `${PR_WORK_JIRA_KEY}-0 WIP: edit before create`
    : "WIP: edit title before create";
  const body = [
    "No agent was run. Replace this with your real title and body, then close the editor and confirm.",
    "",
    "In this directory: `diff.patch`, optional `PULL_REQUEST_TEMPLATE.md` and `jira-tickets-board.md`.",
  ].join("\n");
  const p = path.join(workspaceDir, MERGED_PREVIEW_FILE);
  fs.writeFileSync(p, buildPreviewMarkdown(title, body), "utf8");
}

/**
 * `pr review --no-agent`: replace the preview file with a review template (the
 * prefetched content was the existing PR, not a draft review).
 */
export function seedNoAgentPrReviewStub(workspaceDir: string): void {
  const title = isPrCliWork()
    ? `${PR_WORK_JIRA_KEY}-0 WIP: review summary`
    : "WIP: review summary";
  const body = [
    "> **Review** — add your `gh pr review --comment` body below.",
    "",
    "No agent was run. Use `diff.patch`, `files.txt`, `comments.md`, and other prefetched files in this directory as you write.",
  ].join("\n");
  const p = path.join(workspaceDir, MERGED_PREVIEW_FILE);
  fs.writeFileSync(p, buildPreviewMarkdown(title, body), "utf8");
}

/**
 * `pr update --no-agent`: prefetched GitHub state is in `CURRENT.md`; write a
 * placeholder **`PR.md`** so {@link readAgentPrMarkdown} and the editor step can run.
 */
export function seedNoAgentPrUpdateStub(workspaceDir: string): void {
  const title = isPrCliWork()
    ? `${PR_WORK_JIRA_KEY}-0 WIP: edit before gh pr edit`
    : "WIP: edit title before gh pr edit";
  const body = [
    "No agent was run. Replace this with your updated title and body for `gh pr edit`, then close the editor and confirm.",
    "",
    "Current PR on GitHub is in `CURRENT.md` in this directory.",
  ].join("\n");
  const p = path.join(workspaceDir, MERGED_PREVIEW_FILE);
  fs.writeFileSync(p, buildPreviewMarkdown(title, body), "utf8");
}
