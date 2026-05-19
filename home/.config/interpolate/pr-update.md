You are running **`pr update`**: refresh an existing PR's **title** and **body** to match the branch as it is now.

**PR to update:** `{{target}}` - number or URL. The CLI runs **`gh pr edit`** with your final **title** and **body**. Prefetched data is **embedded in this prompt** below, not read from disk except your **`PR.md`** output.

Use the **prefetched sections** only - do not re-fetch with **`gh`** or the API. If sources disagree on _what changed_, trust the diff, then the files list. Use **Current PR** for the PR as it exists on GitHub today.

When refreshing the **body**, use the default layout below unless the current PR body (or a repo template) already defines sections - reconcile with the diff and comments.

**Default body layout** (use this unless a repo template dictates a different structure - then align with that file; this block is guidance only).

**`## Summary`** - **2-3 lines**: what changes and **why**. No file paths or change inventories.

**`##` sections after Summary** - A **small** number of topical headings by **theme**.

**Inside each section:** one or two short sentences, then **2-5 bullets** for distinct ideas.

**Optional** - **`## Contract changes`** when API work matters.

**Do not:** pad Summary; add Testing checklists; TODO lists; Jira meta. Remove stale testing blocks from the current PR body when carrying content forward.

?work: ## PR title (work policy - NOVACORE)
?work:
?work: The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.
?work:
?work: ## When running **`pr update`**
?work:
?work: - **`KEY-123.md`** (often **`NOVACORE-<id>.md`** in this workspace): Align scope and acceptance wording in the body with the ticket; the `# …` title must satisfy the NOVACORE work policy above.
?work: - **Reconcile the title key with the jira-tickets skill when needed.** If you have the skill available (attached or **`jira-tickets-board.md`** / **`references/**/{KEY}.md`**), confirm the **`NOVACORE-<digits>`** in the title still matches the ticket that best fits the **current** diff and PR intent; adjust the title if the work has shifted to a different issue.
?work:
?work: ## Prefetched ticket file names
?work:
?work: Ticket reference files follow the Jira key in the PR body, e.g. **`NOVACORE-39309.md`** at the workspace root when that key appears in the description.
?work:

## PR context (embedded in this prompt)

Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory** for **`PR.md`** only; the host repository tree is not browsable from here.

### Files changed

```!gh pr view {{target}} --json files --jq '.files[] | "\(.path)  +\(.additions) -\(.deletions)  [\(.changeType)]"' 2>/dev/null || echo "(could not list files)"
```

### CI checks

```!gh pr view {{target}} --json statusCheckRollup --jq '[.. | objects | select(has("name") or has("context")) | select(has("state") or has("status") or has("conclusion")) | (.name // .context) + ": " + (.state // .status // .conclusion // "?")] | unique | .[]' 2>/dev/null || echo "(could not read checks)"
```

### Current PR (`CURRENT.md` snapshot)

```!gh pr view {{target}} --json title,body --jq '"# " + .title + "\n\n" + (.body // "")'
```

### Diff (`diff.patch`)

```!gh pr diff {{target}}
```

### Commits

```!gh pr view {{target}} --json commits --jq '.commits[] | "\(.oid[0:7]) \(.messageHeadline)\(if .messageBody != "" then " - " + (.messageBody | gsub("\\s+"; " ")) else "" end)"'
```

### Comments (`comments.md`)

```!gh pr view {{target}} --comments 2>/dev/null || echo "(no comments)"
```

{{jiraContext}}

**Write `PR.md`** in the cwd (create or overwrite; GitHub's current title/body is in **Current PR** above only):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

The CLI opens **`PR.md`** for edits, then runs **`gh pr edit`**.

**Output:** only **`PR.md`** - no title/body in chat. After writing, you may reply with at most a token like `done`.
