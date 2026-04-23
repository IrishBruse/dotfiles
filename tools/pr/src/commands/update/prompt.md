You are running **`pr update`**: refresh an existing PR’s **title** and **body** to match the branch as it is now.

{{prLine}}

- Use the **prefetched files** in the workspace root (`PR.md`, `commits.txt`, `checks.json`, `comments.md`, `files.json`, `diff.patch`, optional ticket `KEY-123.md` files). Do not re-fetch with `gh` or the API.
- Treat **`diff.patch`** and **`files.json`** as the source of truth for current changes. Use **`PR.md`** for the current title (first `# …` line) and prior body; keep what’s still true, revise where the diff demands it. **`comments.md`**: reflect review briefly if useful, don’t dump threads.

{{prefetchedContextSection}}

**Overwrite `PR.md`** in the workspace root:

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

Title and body must be non-empty. The CLI will open `PR.md` for edits, then run **`gh pr edit`**.

**Output:** deliver **only** by overwriting `PR.md` that way. Do not put the new title, body, or a writeup in your assistant reply—no JSON or fenced content in chat. After writing, you may say at most a token like `done`.
