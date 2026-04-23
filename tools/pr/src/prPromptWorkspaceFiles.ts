import fs from "node:fs";
import path from "node:path";

import { MERGED_PREVIEW_FILE } from "./agentOutputFiles.ts";

const JIRA_KEY_FILE_RE = /^[A-Z][A-Z0-9]+-\d+\.md$/;
const LARGE_BYTES = 1_000_000;

export type PrPromptWorkspaceMode = "create" | "update" | "review";

type Row = { file: string; bytes: number; lines: string; what: string };

function statSafely(abspath: string): { bytes: number; lines: string } | null {
  let st: fs.Stats;
  try {
    st = fs.statSync(abspath);
  } catch {
    return null;
  }
  if (st.size > LARGE_BYTES) {
    return { bytes: st.size, lines: "(large)" };
  }
  let text: string;
  try {
    text = fs.readFileSync(abspath, "utf8");
  } catch {
    return { bytes: st.size, lines: "?" };
  }
  return { bytes: st.size, lines: String(text.split("\n").length) };
}

/**
 * Markdown block for the agent prompt: a table of the files at `workspaceDir`
 * the agent is allowed to read (with bytes/lines and a one-line description),
 * plus a hard rule that nothing else exists.
 */
export function formatPrWorkspaceReadList(
  workspaceDir: string,
  mode: PrPromptWorkspaceMode,
): string {
  const rows: Row[] = [];

  const addIfExists = (name: string, what: string): void => {
    const stats = statSafely(path.join(workspaceDir, name));
    if (stats === null) {
      return;
    }
    rows.push({
      file: `\`${name}\``,
      bytes: stats.bytes,
      lines: stats.lines,
      what,
    });
  };

  if (mode === "create") {
    addIfExists(
      "diff.patch",
      "`git diff origin/main` — **source of truth** for what will ship (may be empty).",
    );
    addIfExists(
      "PULL_REQUEST_TEMPLATE.md",
      "Host repo PR template if the CLI found one; mirror its structure in the body.",
    );
    addIfExists(
      "jira-tickets-board.md",
      "Jira-tickets board snapshot when the skill is installed (e.g. title rules).",
    );
  } else {
    const prLine =
      mode === "review"
        ? "From GitHub. **Replace** with `#` review summary line + full review-comment markdown."
        : "From GitHub. **Replace** with new `#` title + full body for `gh pr edit`.";
    addIfExists(
      "files.txt",
      "One line per path with `+add -del` and change type — read this before `diff.patch` for scope.",
    );
    addIfExists(
      "checks.txt",
      "Short CI digest from `statusCheckRollup` (name and state per check).",
    );
    addIfExists(MERGED_PREVIEW_FILE, prLine);
    addIfExists(
      "diff.patch",
      "Full unified diff (head vs base) — top authority for *what the code does*.",
    );
    addIfExists("commits.txt", "One line per commit: short SHA, subject, optional body.");
    addIfExists("comments.md", "PR thread + inline comments (path:line, hunks, bodies).");
    addIfExists(
      "jira-tickets-board.md",
      "Jira-tickets board snapshot when the skill is installed.",
    );
    for (const name of listJiraKeyMdFiles(workspaceDir)) {
      addIfExists(
        name,
        "Per-Jira-key reference copied from the jira-tickets skill when available.",
      );
    }
  }

  if (rows.length === 0) {
    return "*(No prefetched files in the workspace — that is unexpected.)*\n";
  }

  const lines = [
    "These are **the only** files at the workspace root **right now**; you may `read` only these (and you write `PR.md`). Pick smaller files first when they cover what you need.",
    "",
    "| File | bytes | lines | What |",
    "|------|------:|------:|------|",
    ...rows.map(
      (r) => `| ${r.file} | ${r.bytes} | ${r.lines} | ${r.what} |`,
    ),
    "",
    "Do not `glob`, `read`, or search outside the paths above (no real repo checkout, no `~/.cursor`, no jira-tickets skill on disk).",
  ];
  return lines.join("\n");
}

function listJiraKeyMdFiles(dir: string): string[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => JIRA_KEY_FILE_RE.test(n) && n !== MERGED_PREVIEW_FILE)
    .sort();
}
