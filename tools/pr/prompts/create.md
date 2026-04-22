You are executing **`pr create`**: create a new GitHub PR from the current branch when none exists yet. Follow this document exactly.

## When to use this flow

There is no GitHub PR yet for the current branch. The CLI will run `gh pr create` after you satisfy **Final response** at the end of this document.

## Requirements

- `gh` CLI must be installed

## Steps

- Run `git diff origin/main` and use it for the description.
- Read and use the local PR template if it exists.
- Propose a clear PR title from the branch and diff.

## Final response (required)

When the PR title and body are ready for GitHub, your **last** message must contain **only** one markdown fenced code block tagged `json` with exactly this shape (valid JSON strings; use `\n` inside **body** for newlines if you emit a single-line string):

```json
{"title":"Example title","body":"## Summary\n\n…markdown…"}
```

Do not write anything after the closing fence of that block. The CLI parses this block, renders **title** and **body** as markdown in the terminal, then after **ENTER** (or **ESC** to cancel) runs `gh pr create`.
