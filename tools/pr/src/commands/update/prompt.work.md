## PR title (work policy — NOVACORE)

The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.

## When running **`pr update`**

- **`KEY-123.md`** (often **`NOVACORE-<id>.md`** in this workspace): Align scope and acceptance wording in the body with the ticket; the `# …` title must satisfy the NOVACORE work policy above.
- **Reconcile the title key with the jira-tickets skill when needed.** If you have the skill available (attached or **`jira-tickets-board.md`** / **`references/**/{KEY}.md`**), confirm the **`NOVACORE-<digits>`** in the title still matches the ticket that best fits the **current** **`diff.patch`** and PR intent; adjust the title if the work has shifted to a different issue.

## Prefetched ticket file names

Ticket reference files follow the Jira key in the PR body, e.g. **`NOVACORE-39309.md`** at the workspace root when that key appears in the description.
