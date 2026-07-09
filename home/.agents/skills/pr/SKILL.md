---
name: pr
description: Create, update, or fix the current GitHub pull request. Compose opens or edits title and body, fix repairs red CI and unresolved review comments.
disable-model-invocation: true
user-invocable: false
---

# PR

Work on the current branch pull request: **compose** title and body, or **fix** merge-blocking CI and review feedback.

## Branch

Use **compose** when the prompt includes git diff, PR template, or current PR title and body for editing.
Use **update** within compose when a current PR section or `gh pr view` output is present.
Otherwise use **create**.
Use **fix** when the prompt includes failed checks, workflow logs, or unresolved review threads.
Follow `~/.agents/skills/pr/fix.md` for the fix branch.

## Context

When git state, existing open PRs, check rollup, workflow logs, review threads, and the repo PR template are inlined in the prompt, use that output as the latest state.

If those sections are absent:

- **compose**: run `git diff origin/main`, check `.github/PULL_REQUEST_TEMPLATE.md`.
  For update, also run `gh pr view --json number,title,body`.
- **fix**: run `gh pr checks`, `gh pr view --json statusCheckRollup`, and fetch unresolved review threads with the GitHub GraphQL API.

## Compose

### Create or update

When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

For update, use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.

### Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout inlined below from `body-format.md`.

### Apply

Always create new PRs as **drafts**.
Do not pass `--draft` on update, and do not change draft status when editing an existing PR unless the user asks.

Create:

```bash
gh pr create --draft --base main --title "<title>" --body "<body>"
```

Update:

```bash
gh pr edit --title "<title>" --body "<body>"
```
