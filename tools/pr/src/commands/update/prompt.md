You are running **`pr update`**: refresh an existing PR’s **title** and **body** to match the branch as it is now.

**PR to update:** `{{target}}` — number or URL. The CLI runs `gh pr edit` with your final **title** and **body**; prefetched files are in the **workspace root**.

- Use the **prefetched files** below. Do not re-fetch with `gh` or the API.

**Source of truth:** If sources disagree on *what changed*, **`diff.patch`** then **`files.json`** win. Use **`PR.md`** for narrative, template sections, and links. Use **`commits.txt`** only when it matches the diff. If **`files.json`** and **`diff.patch`** disagree on behavior, trust **`diff.patch`**.

- **`checks.json`:** Mention CI only when it adds signal (failures, follow-ups, stale claims). No raw JSON dumps.
- **`commits.txt`:** Align the commit story; never assert behavior the diff contradicts.
- **`KEY-123.md`:** Align body scope/acceptance with the ticket.
- **`comments.md`:** Reflect review briefly if useful; don’t paste threads.
- **`PR.md`:** Current title and body—keep what’s still true; revise where the diff or review demands.

**PR description — do not:**

- Add **How to verify** (or verification steps / command checklists / “run `npm …`”). **Remove** it when updating if the prefetched body still has that section.
- Mention **Jira / PR title validation**, **missing issue key**, **NOVACORE title checks**, **previous title failed CI**, or **why the title was changed for a validator**. Refresh title and body for the diff; no meta about validators or title gate failures.

## PR context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}`.

Use these paths at the workspace root. Do not run `gh pr …` again. When unsure *what changed*, trust **`diff.patch`** (then **`files.json`**) over **`PR.md`** / **`commits.txt`**.

| Path | Contents |
|------|----------|
| `commits.txt` | One line per commit: SHA, subject, optional body |
| `checks.json` | `statusCheckRollup` — CI pass/fail, job names, log URLs |
| `comments.md` | Inline review comments + PR conversation (path:line, diff hunks, bodies) |
| `files.json` | Changed files from the PR |
| `diff.patch` | Full unified diff |
| `jira-tickets-board.md` | If present: jira-tickets skill board snapshot |
| `KEY-123.md` | Per Jira key in the PR body: copy from jira-tickets `references/**/{KEY}.md`, or board-only fallback |
| `PR.md` | **Prefetched** current PR. **Replace** entirely with `# <title>` and new body; both non-empty when done. |

Parallel subagents share this workspace.

**Write `PR.md`** in the workspace root (replace the prefetched file):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

The CLI opens `PR.md` for edits, then runs **`gh pr edit`**.

**Output:** only `PR.md`—no title/body in chat. After writing, you may reply with at most a token like `done`.
