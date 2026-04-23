## PR title (work policy — NOVACORE)

The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.

## When running **`pr review`**

- Optional Jira ticket copies may be named **`NOVACORE-<id>.md`** (from the jira-tickets skill under `references/**/{KEY}.md`). Use them for product context when reviewing.
- Use the **jira-tickets** skill (**`SKILL.md`** or board snapshot) to see whether the PR’s stated ticket and the **actual diff** align with the right **NOVACORE-** issue (summary vs. change scope). Call out mismatches in the review when relevant.

## Prefetched ticket file names

Ticket reference files follow the Jira key in the PR body, e.g. **`NOVACORE-39309.md`** at the workspace root when that key appears in the description.
