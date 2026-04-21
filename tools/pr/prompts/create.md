You are executing **`pr create`**: create a new GitHub PR from the current branch when none exists yet. Follow this document exactly. Use the ticket and policy lines below when present.

{{ticketLine}}{{jiraBlock}}

## When to use this flow

There is no GitHub PR yet for the current branch. The CLI will run `gh pr create` after you satisfy **Final response** at the end of this document.

## Requirements

- Jira MCP access — **fail** if missing
- `gh` CLI must be installed

## Steps

- Pull the user’s currently assigned Jira tickets with the MCP tool, or use the ticket reference from the CLI (e.g. `NOVACORE-123`) when provided.
- Run `git diff origin/main` and use it for the description.
- Read and use the local PR template if it exists.
- Propose a PR title in the form `<KEY>-<number> - <short title>` (match the project key and any repository policy in the lines above).

## Final response (required)

When the PR title and body are ready for GitHub, your **last** message must contain **only** one markdown fenced code block tagged `json` with exactly this shape (valid JSON strings; use `\n` inside `body` for newlines if you emit a single-line string):

```json
{"title":"NOVACORE-1 - Example title","body":"## Summary\n\n…markdown…"}
```

Do not write anything after the closing fence of that block. The CLI parses this block, renders **title** and **body** as markdown in the terminal, then after **ENTER** (or **ESC** to cancel) runs `gh pr create`.
