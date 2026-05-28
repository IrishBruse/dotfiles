**Repo:** `{{cwd}}` | **Branch:** `{{branch}}` (head) | **PR:** !`gh pr view --json number -q .number || echo "(none)"`

Refresh this pull request's **title** and **body** to match the branch as it is now. The host runs **`gh pr edit`** after you reply.

## Rules

- **Read-only:** you may read files under `{{cwd}}`. No creates, edits, or deletes. No **`git`** or **`gh`**.
- **Diff below is the source of truth** for what ships. Do not re-run git or gh to refetch. Use **Current PR** for what is on GitHub today; drop stale sections that no longer apply. Align the body with the repo template when one is present.
?work:- **Title Requirement:** Must start with `NOVACORE-<digits> - ` (e.g. `NOVACORE-123 - `). Extract the digits accurately from the branch name or commit messages.
- **Formatting Constraints:** Use ASCII text characters only. Do not use emojis, unicode directional arrows (`->` only), or stylized quotes. Use a comma or period instead of a semicolon.

## Body Layout

Unless the repo template says otherwise, use the following exact structure:

### Summary
Provide a 1-2 sentence explanation of the business or technical intent (the "why" and "what"). Follow this with high-level bullets categorized exactly under these headers. Omit any category header if it contains zero items:
- **Added:** New capabilities, endpoints, or public surface area.
- **Removed:** Dropped behavior, deleted features, or removed surface area.
- **Changed:** Internal design shifts, modified logic, or database schema updates. Call out significant API or breaking changes here.

### 2-4 Topical ## Sections
Create 2 to 4 custom sections based on the functional areas touched by the diff (e.g., `## Database`, `## Authentication`, `## Frontend UI`). 
- Start each section with a short, single lead sentence explaining the goal of that area.
- Follow with 2-5 bullet points detailing the specific behavioral changes.
- Do not list file paths, line numbers, or raw code churn. Focus on systemic changes.

### Contract changes (Optional)
Include this section only if consumers need migration details beyond the Summary callouts. If there are no breaking API changes, dependency updates, or contract modifications, omit this section entirely.

### Exclusions
Do not include test checklists, TODOs, Jira metadata, or conversational filler (e.g., "In this PR, I fixed...").

## Context

### Current PR

```md !gh pr view --json title,body --jq '"# " + .title + "\n\n" + (.body // "")"' 2>/dev/null || echo "(could not load current PR)"

```

### Diff

```diff !git diff origin/main

```

### Repo PR template

```md
{{prTemplate}}
```

## Reply

Respond with only the following structure. No preamble, no postscript, no markdown code fence blocks surrounding the entire output, no JSON:

1. `# <title>` (from the diff and branch, not invented scope)
2. Blank line
3. The PR body (markdown)
