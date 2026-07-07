---
name: pr
description: Create or update a GitHub pull request title and body from the current branch. New PRs are always created as drafts. Use when opening or updating a pull request.
disable-model-invocation: true
user-invocable: false
---

# PR

Compose the **title** and **body** from the current branch, then apply with `gh pr create` or `gh pr edit`.

## Create or update

Use **update** when the prompt includes a current PR section or `gh pr view` output for this branch.
Use **create** when no PR exists for this branch.

When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

## Context

When git state, existing open PRs, and the repo PR template are inlined in the prompt, use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent, run `git diff origin/main` and check `.github/PULL_REQUEST_TEMPLATE.md`.
For update, also run `gh pr view --json number,title,body`.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

For update, use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout in `~/.agents/skills/pr/body-format.md`.

## Apply

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
