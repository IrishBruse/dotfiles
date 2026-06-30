---
name: pr-create
description: Open a new GitHub pull request from the current branch.
disable-model-invocation: true
---

# PR Create

Open a new GitHub PR from the current branch against `origin/main`, composing the **title** and **body**, then create it with `gh pr create`.

## Context

When invoked from the `pr` command, git state, existing open PRs, and the repo PR template are inlined in the prompt.
Use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent, run `git diff origin/main` and check `.github/PULL_REQUEST_TEMPLATE.md`.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.
When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout in `~/.agents/skills/pr/body-format.md`.

## Apply

```bash
gh pr create --base main --title "<title>" --body "<body>"
```
