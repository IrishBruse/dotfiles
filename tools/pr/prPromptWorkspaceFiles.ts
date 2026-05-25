import {
  CURRENT_PR_SNAPSHOT_FILE,
  MERGED_PREVIEW_FILE
} from "./agentOutputFiles.ts";

export type PrPromptWorkspaceMode = "create" | "update" | "review";

const JIRA_KEY_FILE_RE = /^[A-Z][A-Z0-9]+-\d+\.md$/;

function prefetchFileOrder(mode: PrPromptWorkspaceMode): string[] {
  if (mode === "create") {
    return ["diff.patch", "PULL_REQUEST_TEMPLATE.md", "jira-tickets-board.md"];
  }
  const snapshot =
    mode === "review" ? MERGED_PREVIEW_FILE : CURRENT_PR_SNAPSHOT_FILE;
  return [
    "files.txt",
    "checks.txt",
    snapshot,
    "diff.patch",
    "commits.txt",
    "comments.md",
    "jira-tickets-board.md"
  ];
}

function sortPrefetchKeys(
  keys: string[],
  mode: PrPromptWorkspaceMode
): string[] {
  const preferred = prefetchFileOrder(mode);
  const rest = keys.filter((k) => !preferred.includes(k)).sort();
  const out: string[] = [];
  for (const p of preferred) {
    if (keys.includes(p)) {
      out.push(p);
    }
  }
  out.push(...rest);
  return out;
}

function describePrefetchFile(
  name: string,
  mode: PrPromptWorkspaceMode
): string {
  if (name === "diff.patch") {
    if (mode === "create") {
      return "`git diff origin/main` - **source of truth** for what will ship (may be empty).";
    }
    return "Full unified diff (head vs base) - top authority for *what the code does*.";
  }
  if (name === "PULL_REQUEST_TEMPLATE.md") {
    return "Host repo PR template if the CLI found one; mirror its structure in the body.";
  }
  if (name === "files.txt") {
    return "One line per path with `+add -del` and change type - read this before `diff.patch` for scope.";
  }
  if (name === "checks.txt") {
    return "Short CI digest from `statusCheckRollup` (name and state per check).";
  }
  if (name === MERGED_PREVIEW_FILE && mode === "review") {
    return "From GitHub. **Replace** with `#` review summary line + full review-comment markdown.";
  }
  if (name === CURRENT_PR_SNAPSHOT_FILE && mode === "update") {
    return "Current PR on GitHub (read-only). **Write** the refreshed `#` title + body to `PR.md` for `gh pr edit`.";
  }
  if (name === "commits.txt") {
    return "One line per commit: short SHA, subject, optional body.";
  }
  if (name === "comments.md") {
    return "PR thread + inline comments (path:line, hunks, bodies).";
  }
  if (name === "jira-tickets-board.md") {
    return "Board list; `{KEY}.md` copies are for title + body keys (see skill `references/`), not every board line.";
  }
  if (JIRA_KEY_FILE_RE.test(name) && name !== MERGED_PREVIEW_FILE) {
    return "Per-Jira-key reference copied from the jira-tickets skill when available.";
  }
  return "Prefetched context file.";
}

/**
 * Markdown block for the agent prompt: table of prefetched files plus full contents between `<<<BEGIN` / `<<<END` markers.
 * Nothing is on disk for the agent to read except **`PR.md`** in its cwd.
 */
export function formatBundledPrefetchForPrompt(
  files: Record<string, string>,
  mode: PrPromptWorkspaceMode
): string {
  const names = sortPrefetchKeys(Object.keys(files), mode);
  if (names.length === 0) {
    return "*(No prefetched context - unexpected.)*\n";
  }

  const rows = names.map((name) => {
    const content = files[name] ?? "";
    const bytes = Buffer.byteLength(content, "utf8");
    const lines = String(content.split("\n").length);
    return {
      name,
      bytes,
      lines,
      what: describePrefetchFile(name, mode),
      content
    };
  });

  const linesOut = [
    "Prefetched **PR context** is fully embedded below (table then raw file blocks). This is **all** of it - do not assume other paths, and do not `glob`/`read` outside your agent cwd for more GitHub or Jira context.",
    "",
    "Pick smaller files first when they cover what you need (often `files.txt` before `diff.patch`).",
    "",
    "| File | bytes | lines | What |",
    "|------|------:|------:|------|",
    ...rows.map(
      (r) => `| \`${r.name}\` | ${String(r.bytes)} | ${r.lines} | ${r.what} |`
    ),
    "",
    "## Prefetched file contents",
    "",
    ...rows.flatMap((r) => [
      `### \`${r.name}\``,
      "",
      `<<<BEGIN ${r.name}>>>`,
      r.content,
      `<<<END ${r.name}>>>`,
      ""
    ])
  ];
  return linesOut.join("\n");
}
