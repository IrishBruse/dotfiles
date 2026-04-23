You are executing **`pr update`**: refresh the **title** and **description** (body) of an existing GitHub PR so they match the current branch state.

{{prLine}}

{{hintBlock}}

## Requirements

- The CLI already ran `gh` and wrote PR data into the **workspace root** (`view.json`, `files.json`, `threads.json`, `diff.patch`). Use those files for the current title, body, base/head, diff, and threads — do not run `gh` or the GitHub API again to fetch PR content.

{{prefetchedContextSection}}

## What to produce

1. Read **`view.json`** for the current title and body (and metadata).
2. Use **`diff.patch`** and **`files.json`** as the source of truth for what the PR contains **now**.
3. Write a **clear, accurate title** and a **markdown body** suitable for the PR description (summary, testing notes, breaking changes if any). Improve on the previous text where the diff warrants it; keep still-accurate context from the old body.
4. If **`threads.json`** has review discussion, you may briefly reflect it when helpful; do not paste long threads.

## Final response (required)

When the new title and body are ready, your **last** message must contain **only** one markdown fenced code block tagged `json` with exactly this shape (valid JSON strings; use `\n` inside **body** for newlines if you emit a single-line string):

```json
{"title":"Example title","body":"## Summary\n\n…markdown…"}
```

Do not write anything after the closing fence. The CLI parses this block, previews **title** and **body**, then after **Enter** (or **Esc** to cancel) runs **`gh pr edit`** for this PR.
