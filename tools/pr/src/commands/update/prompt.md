You are executing **`pr update`**: refresh the **title** and **description** (body) of an existing GitHub PR so they match the current branch state.

{{prLine}}

{{hintBlock}}

## Requirements

- The CLI already prefetched PR data into the **workspace root** (`PR.md`, `commits.txt`, `checks.json`, `comments.md`, `files.json`, `diff.patch`, optionally **`KEY-123.md`** ticket files like `NOVACORE-39309.md`). Use those files — do not run `gh` or the GitHub API again to fetch PR content.

{{prefetchedContextSection}}

## What to produce

1. Read **`PR.md`** — it contains the **current** PR title (first `# …` line) and description (rest). There is no separate metadata JSON; infer context from **`commits.txt`**, **`files.json`**, **`diff.patch`**, **`checks.json`**, and **`comments.md`** as needed.
2. Use **`diff.patch`** and **`files.json`** as the source of truth for what the PR contains **now**.
3. Plan an updated **title** and **markdown body** suitable for the PR description (summary, testing notes, breaking changes if any). Improve on the previous text where the diff warrants it; keep still-accurate context from the old body.
4. If **`comments.md`** has review discussion, you may briefly reflect it when helpful; do not paste long threads.

## Final deliverable (required)

Overwrite **`PR.md`** in the **workspace root**:

1. First line: **`# `** plus the **new** PR title (trimmed).
2. A blank line.
3. The **new** full markdown PR description.

Title and body must both be **non-empty**. The CLI opens **`PR.md`** for a final edit, then runs **`gh pr edit`** after approval.

### Output discipline (strict)

- **Only** deliver by **overwriting** **`PR.md`** in this shape. Do not use **`Title.md`** / **`Body.md`**.
- **Do not** use your final assistant message for PR title, body, summaries, bullet lists of changes, or review-style prose. **Do not** emit JSON, fenced code blocks, or a “here’s the updated PR…” writeup in chat.
- **Do not** reply with anything substantive after the files are written. If the runtime still expects a final token, use at most a bare acknowledgment (e.g. `done`) with **no** PR content duplicated there.
