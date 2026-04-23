You are running **`pr update`**: refresh an existing PR’s **title** and **body** to match the branch as it is now.

**PR to update:** `{{target}}` — number or URL. The CLI runs `gh pr edit` with your final **title** and **body**; prefetched files are in the **workspace root**.

- Use the **prefetched files** below. Do not re-fetch with `gh` or the API.

**Source of truth:** If sources disagree on _what changed_, **`diff.patch`** then **`files.json`** win. Use **`PR.md`** for narrative, template sections, and links. Use **`commits.txt`** only when it matches the diff. If **`files.json`** and **`diff.patch`** disagree on behavior, trust **`diff.patch`**. If `{KEY}.md` exists, align body scope/acceptance with the ticket; otherwise use **`jira-tickets-board.md`** (if any) for key wording only.

When refreshing the **body**, use the default layout below unless the current **`PR.md`** (or a repo template described there) already defines sections—reconcile with **`diff.patch`**, `comments.md`, and **`PR.md`**; this workspace has **no** separate copy of the host repo’s `PULL_REQUEST_TEMPLATE.md` unless the prefetched `PR.md` text itself references that structure.

{{defaultPrBodyInstructions}}

## PR context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}` — a **throwaway copy**; the host repository tree is not browsable from here. The table under **Read-only paths** is generated from disk; if a name is absent, that file was not prefetched. Jira help is only from rows that appear (and `jira-tickets-board.md` / `{KEY}.md` when present), not the live skill folder on disk.

## Read-only paths

{{files}}

When unsure _what changed_, trust **`diff.patch`** (then **`files.json`**) over **`PR.md`** / **`commits.txt`**. In **`comments.md`**, use review signal briefly; don’t paste whole threads. For **`checks.json`**, mention CI only when it adds real signal (not raw JSON dumps). **`commits.txt`** is narrative-only if it still matches the diff.

Parallel subagents share this workspace.

**Write `PR.md`** in the workspace root (replace the prefetched file):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

The CLI opens `PR.md` for edits, then runs **`gh pr edit`**.

**Output:** only `PR.md`—no title/body in chat. After writing, you may reply with at most a token like `done`.
