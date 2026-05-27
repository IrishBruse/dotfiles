**Repo:** `{{cwd}}` | **Branch:** `{{branch}}` (head) | **PR:** `{{target}}`

Refresh this pull request's **title** and **body** to match the branch as it is now. The host runs **`gh pr edit`** after you reply.

## Rules

- **Read-only:** you may read files under `{{cwd}}`. No creates, edits, or deletes. No **`git`** or **`gh`**.
- **Diff below is the source of truth** for what ships. Do not re-run git or gh to refetch. Use **Current PR** for what is on GitHub today; drop stale sections (testing checklists, TODOs) that no longer apply.
- Align the body with the repo template when one is present.

?env:PR_CLI_WORK: **Title:** must start with `NOVACORE-<digits>` (e.g. `NOVACORE-123`).
?env:PR_CLI_WORK:

## Body layout

Unless the repo template or current body already defines structure:

- **`## Summary`** - 2-3 lines, what and why (no path inventories)
- **2-4 topical `##` sections** - short lead sentence, then 2-5 bullets
- Optional **`## Contract changes`** when APIs/contracts change
- Skip: test checklists, TODOs, Jira meta

## Context

### Current PR

```!gh pr view {{target}} --json title,body --jq '"# " + .title + "\n\n" + (.body // "")"' 2>/dev/null || echo "(could not load current PR)"

```

### Diff

```diff !git diff origin/main

```

### Repo PR template

```md
{{prTemplate}}
```

## Reply

Respond with **only**:

1. `# <title>` (from the diff and branch, not invented scope)
2. Blank line
3. The PR body (markdown)

No preamble, no fenced blocks, no JSON.
