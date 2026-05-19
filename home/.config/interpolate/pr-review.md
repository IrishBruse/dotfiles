# Shared: GitHub PR review (pr-cli)

Follow this preamble for any review flow the CLI launches.

**Review target:** `{{target}}` - PR number (current repo) or full PR URL. The CLI posts the review with this target. **PR data and diffs are embedded in this prompt** (not on disk except your **`PR.md`** output).

## Requirements

- Use **only** the prefetched sections below. No **`gh`** or GitHub API for PR content. No **`glob`**, **`codebase_search`**, or **`read`** of source files from the real repo - only what appears in this message.
- After reading them, you **replace `PR.md` entirely** with the review: `#` summary line, blank line, then the full **GitHub review comment** markdown. The first line of that body must be exactly `> Reviewed by Cursor ({{reviewModelLabel}})` (this run's model; do not substitute a different name).

?work: ## PR title (work policy - NOVACORE)
?work:
?work: The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.
?work:
?work: ## When running **`pr review`**
?work:
?work: - Optional Jira ticket copies may be named **`NOVACORE-<id>.md`** (from the jira-tickets skill under `references/**/{KEY}.md`). Use them for product context when reviewing.
?work: - Use the **jira-tickets** skill (**`SKILL.md`** or board snapshot) to see whether the PR's stated ticket and the **actual diff** align with the right **NOVACORE-** issue (summary vs. change scope). Call out mismatches in the review when relevant.
?work:
?work: ## Prefetched ticket file names
?work:
?work: Ticket reference files follow the Jira key in the PR body, e.g. **`NOVACORE-39309.md`** at the workspace root when that key appears in the description.
?work:

## PR context (embedded in this prompt)

Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory**; you only add or overwrite **`PR.md`** there.

### Files changed (`files.txt`)

```!gh pr view {{target}} --json files --jq '.files[] | "\(.path)  +\(.additions) -\(.deletions)  [\(.changeType)]"' 2>/dev/null || echo "(could not list files)"
```

### CI checks (`checks.txt`)

```!gh pr view {{target}} --json statusCheckRollup --jq '[.. | objects | select(has("name") or has("context")) | select(has("state") or has("status") or has("conclusion")) | (.name // .context) + ": " + (.state // .status // .conclusion // "?")] | unique | .[]' 2>/dev/null || echo "(could not read checks)"
```

### PR snapshot (`PR.md` from GitHub - replace entirely with your review)

```!gh pr view {{target}} --json title,body --jq '"# " + .title + "\n\n" + (.body // "")'
```

### Diff (`diff.patch`)

```!gh pr diff {{target}}
```

### Commits (`commits.txt`)

```!gh pr view {{target}} --json commits --jq '.commits[] | "\(.oid[0:7]) \(.messageHeadline)\(if .messageBody != "" then " - " + (.messageBody | gsub("\\s+"; " ")) else "" end)"'
```

### Comments (`comments.md`)

```!gh pr view {{target}} --comments 2>/dev/null || echo "(no comments)"
```

{{jiraContext}}

Do not run **`gh pr ...`** again.

Avoid repeating feedback already in comments.

## Final deliverable

Overwrite **`PR.md`** in the cwd. The CLI reads it after you finish - do not rely on chat for posting.

Title (`# ...` line) and body must be **non-empty**. The human approves in VS Code preview, then the CLI runs **`gh pr review --comment`**.

# First-pass review (`pr review`)

You are running **`pr review`**: first-pass review of the PR above. Complete the analysis below, then satisfy **Final deliverable** (**`PR.md`** only).

## 1. Scope

1. **Primary:** the diff and files list (and the PR snapshot for stated intent). Do **not** **`read`** files from the product repo; the diff is the code window you get.
2. **Stay in scope:** Changes this PR introduces; do not chase unrelated code outside the diff unless you infer a risk only from the patch text.

## 2. Parallel subagents (read-only)

Launch three subagents in parallel. They report only; they do not edit code.

### Agent A: Code quality

Logic clarity, naming, unnecessary complexity, defensive over-engineering, weak typing (`any`, loose casts).

### Agent B: Performance

N+1, hot-loop cost, concurrency/`await`, memory in hot paths, noisy logging in tight loops.

### Agent C: Consistency

Project patterns, DRY, ergonomics of new public surfaces.

## 3. Synthesis

Consolidate into **`PR.md`** body (after the `# ...` line):

1. **Executive summary** - merge posture (e.g. safe / needs changes / nits).
2. **Actionable suggestions** - specific; fenced code only when it helps.
3. **Discussion points** - architecture or product questions.

The **`# ...`** line should mirror the gist of the review.

## 4. Post-review validation

If you ran any checks locally, note what ran or was skipped. (Default: read-only unless the user asked for fixes.)
