You are executing **`pr update`**: refresh the **title** and **description** (body) of an existing GitHub PR so they match the current branch state.

{{prLine}}

{{hintBlock}}

## Requirements

- The CLI already prefetched PR data into the **workspace root** (`view.json`, `commits.txt`, `checks.json`, `review-threads.json`, `files.json`, `threads.json`, `diff.patch`, optionally **`KEY-123.md`** ticket files like `NOVACORE-39309.md`). Use those files — do not run `gh` or the GitHub API again to fetch PR content.

{{prefetchedContextSection}}

## What to produce

1. Read **`view.json`** for the current title and body (and metadata).
2. Use **`diff.patch`** and **`files.json`** as the source of truth for what the PR contains **now**.
3. Plan an updated **title** and **markdown body** suitable for the PR description (summary, testing notes, breaking changes if any). Improve on the previous text where the diff warrants it; keep still-accurate context from the old body.
4. If **`threads.json`** has review discussion, you may briefly reflect it when helpful; do not paste long threads.

## Final deliverable (required)

Write two files in the **workspace root**:

1. **`Title.md`** — New PR title (trimmed).
2. **`Body.md`** — Full markdown PR description.

Both must exist and be **non-empty**. The CLI reads them, previews, then runs **`gh pr edit`** after approval.

### Output discipline (strict)

- **Only** deliver by **creating or overwriting** **`Title.md`** and **`Body.md`**. Put every character of the title in **`Title.md`** and every character of the description in **`Body.md`**.
- **Do not** use your final assistant message for PR title, body, summaries, bullet lists of changes, or review-style prose. **Do not** emit JSON, fenced code blocks, or a “here’s the updated PR…” writeup in chat.
- **Do not** reply with anything substantive after the files are written. If the runtime still expects a final token, use at most a bare acknowledgment (e.g. `done`) with **no** PR content duplicated there.
