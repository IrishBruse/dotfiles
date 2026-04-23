import fs from "node:fs";
import path from "node:path";

import { MERGED_PREVIEW_FILE } from "./agentOutputFiles.ts";

const JIRA_KEY_FILE_RE = /^[A-Z][A-Z0-9]+-\d+\.md$/;

export type PrPromptWorkspaceMode = "create" | "update" | "review";

/**
 * Markdown block for the agent prompt: table of **existing** files at `workspaceDir`
 * the agent is allowed to read, plus a short no-other-paths rule.
 */
export function formatPrWorkspaceReadList(
  workspaceDir: string,
  mode: PrPromptWorkspaceMode,
): string {
  const rows: { file: string; what: string }[] = [];

  const addIfExists = (name: string, what: string): void => {
    try {
      if (fs.existsSync(path.join(workspaceDir, name))) {
        rows.push({ file: `\`${name}\``, what });
      }
    } catch {
      // ignore
    }
  };

  if (mode === "create") {
    addIfExists(
      "diff.patch",
      "`git diff origin/main` — **source of truth** for what will ship (may be empty).",
    );
    addIfExists(
      "PULL_REQUEST_TEMPLATE.md",
      "Host repo’s PR template when the CLI found one; mirror in the body if useful.",
    );
    addIfExists(
      "jira-tickets-board.md",
      "Jira-tickets board snapshot (e.g. title rules) when the skill is installed.",
    );
  } else {
    const prLine =
      mode === "review"
        ? "From GitHub; **replace** with your `#` one-line review summary plus the full **review comment** to post."
        : "From GitHub; **replace** with your new `#` title and full body for `gh pr edit`.";
    addIfExists("diff.patch", "Unified diff (head vs base) — top authority for *what the code does*.");
    addIfExists("files.json", "Changed files list (`gh` JSON for this PR).");
    addIfExists(MERGED_PREVIEW_FILE, prLine);
    addIfExists("commits.txt", "One line per commit: short SHA, subject, optional message.");
    addIfExists("checks.json", "`statusCheckRollup` — CI pass/fail, job names, log URLs.");
    addIfExists("comments.md", "PR thread + inline comments (path:line, hunks, bodies).");
    addIfExists(
      "jira-tickets-board.md",
      "Jira-tickets board snapshot when the skill is installed.",
    );
    for (const name of listJiraKeyMdFiles(workspaceDir)) {
      addIfExists(
        name,
        "Jira key reference the CLI could copy in (from the skill `references/…` when available).",
      );
    }
  }

  if (rows.length === 0) {
    return "*(No readable prefetched files found in the workspace, which is unexpected.)*\n";
  }

  const table = [
    "These are **the only** paths at the workspace root that exist **right now**; you may `read` only these files (and then write `PR.md` as instructed). There is no other project tree or file set to discover here.",
    "",
    "| File | What |",
    "|------|------|",
    ...rows.map((r) => `| ${r.file} | ${r.what} |`),
    "",
    "Do not `glob`, `read`, or search outside the paths above (including the real repository checkout, `~/.cursor`, or jira-tickets skill install paths).",
  ];
  return table.join("\n");
}

function listJiraKeyMdFiles(dir: string): string[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter(
      (n) =>
        JIRA_KEY_FILE_RE.test(n) && n !== MERGED_PREVIEW_FILE,
    )
    .sort();
}
