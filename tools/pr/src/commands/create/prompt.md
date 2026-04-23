**Repository (`gh pr create` cwd):** `{{repoRoot}}` — same path the CLI printed to stderr. Git operations for the diff and branch are from this tree.

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet). Follow this file.

**Source branch:** `{{branch}}` — the CLI runs `gh pr create` from the **repository directory** (see below), so the new PR’s head is **this branch**. There is no GitHub PR on this branch yet.

- Use the **prefetched files** in the workspace root below. They materialize the branch and `origin/main` diff from the real repo; do not substitute live `git` output from elsewhere.
- The host runs **`gh pr create`** from the **repository directory** after you finish; you only write **`PR.md`** in the workspace.

**Source of truth:** **`diff.patch`** decides what ships. The **Source branch** line names the PR head. If **`PULL_REQUEST_TEMPLATE.md`** exists, shape the **body** with it—fill from the diff; do not contradict the diff.

- If **`diff.patch`** is empty or tiny, say so in the body instead of inventing scope.

**PR description — do not:**

- Add **How to verify** (or the same under another heading: verification steps, command checklists, “run `npm …`”, etc.).
- Mention **Jira / PR title validation**, **missing issue key**, **NOVACORE title checks**, **previous title failed CI**, or **why the title was changed for a validator**. Use a correct `#` title and describe the work—no meta about validators or title gate failures.

## Create context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}`.

Use these files at the workspace root. Do not run `gh pr …` (no PR yet). Facts about the change come from **`diff.patch`**, not the branch name or template alone.

| Path | Contents |
|------|----------|
| `diff.patch` | `git diff origin/main` — **source of truth** for what will ship |
| `jira-tickets-board.md` | If present: jira-tickets skill board snapshot (NOVACORE title rules when work policy applies) |
| `PULL_REQUEST_TEMPLATE.md` | Repo template if any; mirror its structure in **PR.md** body |
| `PR.md` | **You write:** `# <title>`, blank line, full body. Both non-empty. |

Parallel subagents share this workspace.

**Write `PR.md`** in the workspace root:

1. First line: `# <title>` (grounded in **`diff.patch`** and **Source branch**).
2. Blank line, then the full **new** body (markdown).

The CLI opens `PR.md` for edits, then creates the PR on **this** branch.

**Output:** only `PR.md`—no title/body in chat (no JSON or fenced PR text). After writing, you may reply with at most a token like `done`.
