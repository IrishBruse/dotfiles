**Repository (`gh pr create` cwd):** `{{repoRoot}}` — same path the CLI printed to stderr. Git operations for the diff and branch are from this tree.

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet). Follow this file.

**Source branch:** `{{branch}}` — the CLI runs `gh pr create` from the **repository directory** (see below), so the new PR’s head is **this branch**. There is no GitHub PR on this branch yet.

- Use the **prefetched files** in **Create context** (only those files exist; the CLI injects a fresh list of paths from disk in that section — there is nothing else to read). They materialize the branch and `origin/main` diff; do not substitute live `git` output from elsewhere.
- The host runs **`gh pr create`** from the **repository directory** after you finish; you only write **`PR.md`** in the workspace.

**Source of truth:** **`diff.patch`** decides what ships. The **Source branch** line names the PR head. If **`PULL_REQUEST_TEMPLATE.md`** exists, shape the **body** with it—fill from the diff; do not contradict the diff. If there is no repo template, or it is only placeholders, use the default layout below.

- If **`diff.patch`** is empty or tiny, say so in the body instead of inventing scope.

{{defaultPrBodyInstructions}}

## Create context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}` — a **throwaway copy**; nothing else from the real repo is mirrored here.

{{files}}

**You write (only):** `PR.md` at the same root: `# <title>`, blank line, full body. Both non-empty. (`PR.md` is not in the list above until you create it; it is the only file you add or overwrite.)

Do not run `gh pr …` (no PR yet). Facts about the change come from **`diff.patch`**, not the branch name or template alone.

Parallel subagents share this workspace.

**Write `PR.md`** in the workspace root:

1. First line: `# <title>` (grounded in **`diff.patch`** and **Source branch**).
2. Blank line, then the full **new** body (markdown).

The CLI opens `PR.md` for edits, then creates the PR on **this** branch.

**Output:** only `PR.md`—no title/body in chat (no JSON or fenced PR text). After writing, you may reply with at most a token like `done`.
