You are running **`pr update`**: refresh an existing PR’s **title** and **body** to match the branch as it is now.

**PR to update:** `{{target}}` — number or URL. The CLI runs `gh pr edit` with your final **title** and **body**; prefetched files are in the **workspace root**.

- Use the **prefetched files** below. Do not re-fetch with `gh` or the API.

**Source of truth:** If sources disagree on _what changed_, **`diff.patch`** then **`files.json`** win. Use **`PR.md`** for narrative, template sections, and links. Use **`commits.txt`** only when it matches the diff. If **`files.json`** and **`diff.patch`** disagree on behavior, trust **`diff.patch`**. If `{KEY}.md` exists, align body scope/acceptance with the ticket; otherwise use **`jira-tickets-board.md`** (if any) for key wording only.

When refreshing the **body**, use the default layout below unless the current **`PR.md`** (or a repo template described there) already defines sections—reconcile with **`diff.patch`**, `comments.md`, and **`PR.md`**; this workspace has **no** separate copy of the host repo’s `PULL_REQUEST_TEMPLATE.md` unless the prefetched `PR.md` text itself references that structure.

{{defaultPrBodyInstructions}}

## PR context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}` — a **throwaway copy**; the host repository tree is not browsable from here.

**Read only** these paths **at the workspace root** (if a file is missing, it was not prefetched—do not search for it). Do not **`glob`**, `grep` the whole tree, `codebase_search`, or `read` paths under the real project, `~/.cursor`, or skills on disk. Jira context is only what appears in the listed files, not the live jira-tickets skill folder.

| Read                                | When                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `diff.patch`                        | Always — full unified diff; top authority for _what the code does_.                                                                         |
| `files.json`                        | Always — changed paths for this PR.                                                                                                         |
| `PR.md`                             | Always — current title and body; **replace** entirely when done.                                                                            |
| `commits.txt`                       | Always — one line per commit.                                                                                                               |
| `checks.json`                       | Always — `statusCheckRollup` (CI).                                                                                                          |
| `comments.md`                       | Always — review + inline comments.                                                                                                          |
| `jira-tickets-board.md`             | Only if the file exists — board snapshot.                                                                                                   |
| `{KEY}.md` (e.g. `NOVACORE-123.md`) | Only if the file exists — one per Jira key the CLI could resolve; if missing, `jira-tickets-board.md` (if any) is the only extra Jira help. |

When unsure _what changed_, trust **`diff.patch`** (then **`files.json`**) over **`PR.md`** / **`commits.txt`**. In **`comments.md`**, use review signal briefly; don’t paste whole threads. For **`checks.json`**, mention CI only when it adds real signal (not raw JSON dumps). **`commits.txt`** is narrative-only if it still matches the diff.

Parallel subagents share this workspace.

**Write `PR.md`** in the workspace root (replace the prefetched file):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

The CLI opens `PR.md` for edits, then runs **`gh pr edit`**.

**Output:** only `PR.md`—no title/body in chat. After writing, you may reply with at most a token like `done`.
