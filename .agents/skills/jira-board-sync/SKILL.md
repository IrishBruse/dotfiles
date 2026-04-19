---
name: jira-board-sync
description: Sync down the current state of the Jira board
disable-model-invocation: true
---

# Jira board sync

## Goal

Use Atlassian MCP to pull the current board tickets from JQL and mirror them to markdown files.

Each ticket must be written as:

- one markdown file per issue
- with YAML frontmatter
- filename = uppercase Jira key (for example: `NOVACORE-123.md`)

| Folder                         | JQL (source of truth)                                                             |
| ------------------------------ | --------------------------------------------------------------------------------- |
| **`~/jira-board/me/`**         | `sprint in openSprints() AND assignee = currentUser()`                            |
| **`~/jira-board/team/`**       | `sprint in openSprints() AND assignee is not EMPTY AND assignee != currentUser()` |
| **`~/jira-board/unassigned/`** | `sprint in openSprints() AND assignee is EMPTY`                                   |

Same issue must appear in **only one** folder (pick the JQL that matches it).

## Prerequisites

- Atlassian MCP with JQL search (`searchJiraIssuesUsingJql` or equivalent).
- **`cloudId`**: `JIRA_CLOUD_ID` or MCP site resolution.

## Steps (three passes for a full sync)

1. **me/** — run the table JQL for `me`, fetch, write/delete under `me/` only.
2. **team/** — run the table JQL for `team`, fetch, write/delete under `team/` only.
3. **unassigned/** — run the table JQL for `unassigned`, fetch, write/delete under `unassigned/` only.

For each pass:

- Query Jira through MCP (paginate until all matching issues are fetched).
- Ensure results are scoped to the **current sprint** (`sprint in openSprints()`).
- For each issue, write/update `KEY.md` where `KEY` is uppercase.
- Delete stale `*.md` files in that folder that are no longer returned by that folder's JQL.

Shared rules:

- `mkdir -p` each folder before writes.
- Keep non-ticket files (dotfiles, config files) untouched.
- If MCP fetch fails for a folder, do **not** delete existing files in that folder.

## Markdown file format

Use this shape for each ticket file:

```md
---
title: Ticket summary
assigned: Jane Doe
type: Story
url: https://<site>.atlassian.net/browse/<JIRA-KEY>
---

[Ticket description here in markdown]
```

Guidance:

- Keep frontmatter concise and machine-readable.
- Keep body readable for humans; avoid dumping huge raw JSON.
- Prefer stable fields over every possible Jira field.
