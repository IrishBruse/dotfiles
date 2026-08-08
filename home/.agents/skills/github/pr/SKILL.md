---
name: pr
description: "Create or update the current GitHub pull request. Use when asked to open, draft, edit, or refresh a PR."
---

# PR

Work on the current branch pull request.

## Route

1. Run `gh pr view` (current branch).
2. **Open PR** -> **compose** then **update**.
3. **No open PR** -> **compose** then **create**.
   User wording like "update" or `/pr update` still means **create** when none exists.
   Say that once in the final reply. Do not thrash looking for a closed/other-branch PR.

Follow `compose.md` for **compose**, **create**, and **update**.

When the branch belongs to a stack (`gh stack view --short` succeeds), `gh stack` owns the base and
the PR already exists, so take the **update** path and follow the `gh-stack` skill for the chain.

## Preflight (before compose)

Run in the repo the user named (or cwd):

```bash
git status -sb
git branch -vv
gh pr view --json number,title,url,state,baseRefName,headRefName,body
git diff origin/main...HEAD --stat
```

If `gh pr view` fails with no PR, continue to create. Do not search PR history or agent transcripts for a ticket.

### Uncommitted local work

`git diff origin/main...HEAD` is what ships on the PR.
If `git status` shows modified or untracked files that belong in this change:

1. Tell the user what is local-only and not on the branch yet.
2. Ask whether to commit and push before create/update.
3. Do not silently omit that work, and do not commit unless they confirm.

### Size

Read the preflight `--stat` as a review budget, weighing lines by how hard they are to review:

- Around **500** lines of dense implementation is a full PR.
- Up to around **1000** is fine when most of it reviews fast, scaffolding, templates, config, generated files, or fixtures.

Past that budget, name the natural seam you see in the diff and offer the `split-to-prs` skill before composing.
The user decides, carry on with the single PR on their word.

## Title

Titles must start with an open-or-recent NOVACORE key. Follow `title.md`.
If the key is still ambiguous after the short lookup there, stop and ask once.
Do not invent a key. Do not mine chat transcripts or run broad Jira text searches.

## Context

- Diff truth: `git diff origin/main...HEAD` (and the repo `.github/PULL_REQUEST_TEMPLATE.md` when present).
- Update body baseline: `gh pr view --json number,title,body`.
- Ticket lookup: `jira info`, then `jira show KEY` / local `jira/` only as in `title.md`. Prefer `jira` CLI over Atlassian MCP. Never `acli`.
