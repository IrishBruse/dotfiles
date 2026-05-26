**Repo:** `{{cwd}}` | **Branch:** `{{branch}}` (head) | **Base:** `origin/main`

Open a new GitHub PR from this branch. The host runs **`gh pr create`** after you reply.

## Rules

- **Read-only:** you may read files under `{{cwd}}`. No creates, edits, or deletes. No **`git`** or **`gh`**.
- **Diff below is the source of truth** for what ships. Do not re-run git to refetch. Align the body with the repo template when one is present.

?env:PR_CLI_WORK: **Title:** must start with `NOVACORE-<digits>` (e.g. `NOVACORE-123`).
?env:PR_CLI_WORK:

## Body layout

Unless the repo template says otherwise:

- **`## Summary`** - 2-3 lines, what and why (no path inventories)
- **2-4 topical `##` sections** - short lead sentence, then 2-5 bullets
- Optional **`## Contract changes`** when APIs/contracts change
- Skip: test checklists, TODOs, Jira meta

## Context

### Diff

```diff !git diff origin/main

```

### Repo PR template

{{prTemplate}}

## Reply

Respond with **only**:

1. `# <title>` (from the diff and branch, not invented scope)
2. Blank line, then the PR body (markdown)

Optional final line: `done`. No preamble, no fenced blocks, no JSON.
