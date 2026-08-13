---
name: pr
description: "Create or update the current GitHub pull request. Use when asked to open, draft, edit, or refresh a PR."
---

# PR

Work on the current branch pull request.
This skill formats the title and body (Summary and descriptions).
On update, preserve any reviewer proof already in the body.

## Route

1. Run `gh pr view` (current branch).
2. **Open PR** -> **compose** then **update**.
3. **No open PR** -> **compose** then **create**.
   User wording like "update" or `/pr update` still means **create** when none exists.
   Say that once in the final reply. Do not thrash looking for a closed/other-branch PR.

Follow `compose.md` for **compose**, **create**, and **update**.
A request to create a PR authorizes the standard push required to create its draft.

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
If `git status` shows modified or untracked files:

1. Compare each local-only path with the branch diff and requested change.
2. If a path clearly belongs, ask once: "Commit, push, and include these files in this PR?"
   Do not commit without yes.
3. If a path is unrelated, continue with the branch diff and name the excluded paths in the reply.
4. Do not ask separately about the required push after the user confirms inclusion.

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

## Finish

Complete the requested create or update. Do not stop after drafting a title or body.
After success, return the PR URL and draft status. Do not offer a next-work menu unless blocked.

## Context

- Diff truth: `git diff origin/main...HEAD` (and the repo `.github/PULL_REQUEST_TEMPLATE.md` when present).
- Update body baseline: `gh pr view --json number,title,body`.
- Ticket lookup: `jira info`, then `jira show KEY` / local `~/jira` only as in `title.md`. Prefer `jira` CLI over Atlassian MCP. Never `acli`.
