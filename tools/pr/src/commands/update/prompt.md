You are running **`pr update`**: refresh an existing PR’s **title** and **body** to match the branch as it is now.

{{prLine}}

- Use the **prefetched files** in the workspace root (`PR.md`, `commits.txt`, `checks.json`, `comments.md`, `files.json`, `diff.patch`, optional ticket `KEY-123.md` files). Do not re-fetch with `gh` or the API.

**Source of truth / precedence:** When anything disagrees about *what changed*, **`diff.patch`** and **`files.json`** win. Use **`PR.md`** to preserve accurate narrative, template sections, and links. Use **`commits.txt`** for intent or a short commit-series summary only when it aligns with the diff. If **`files.json`** and **`diff.patch`** disagree (rare), prefer **`diff.patch`** for behavioral claims.

- **`checks.json`:** Mention CI in the body only when it adds signal (failing checks, follow-ups, or correcting a stale CI claim). Do not paste raw JSON.
- **`commits.txt`:** Summarize or align the commit story; do not assert code behavior the diff contradicts.
- **`KEY-123.md`:** Align scope and acceptance wording in the body with the ticket.
- **`comments.md`:** Reflect review briefly if useful; don’t dump threads.
- **`PR.md`:** Current title (first `# …` line) and prior body—keep what’s still true, revise where the diff or review context demands it.

{{prefetchedContextSection}}

**Write `PR.md`** in the workspace root (replace the prefetched file entirely):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

Title and body must be non-empty. The CLI will open `PR.md` for edits, then run **`gh pr edit`**.

**Output:** deliver **only** by writing `PR.md` that way. Do not put the new title, body, or a writeup in your assistant reply—no JSON or fenced content in chat. After writing, you may say at most a token like `done`.
