---
name: pr-update
description: Refresh an existing GitHub pull request title and body to match the current branch.
disable-model-invocation: true
---

# PR Update

Refresh the current pull request's **title** and **body** so they match the branch as it is now, then apply them with `gh pr edit`.

## Context

When invoked from the `pr` command, the current PR on GitHub, git state, existing open PRs, and the repo PR template are inlined in the prompt.
Use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent, run `gh pr view --json number,title,body` and `git diff origin/main`.

Use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.
The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout in `~/.agents/skills/pr/body-format.md`.

## Apply

```bash
gh pr edit --title "<title>" --body "<body>"
```
