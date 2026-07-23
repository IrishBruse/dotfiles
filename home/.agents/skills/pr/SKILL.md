---
name: pr
description: "Create or update the current GitHub pull request. Use when asked to open, draft, edit, or refresh a PR."
---

# PR

Work on the current branch pull request.

Run `gh pr view` first. No open PR routes **compose** **create**; an open PR routes **compose** **update**.

## Branches

- **compose**: draft PR title and body, plus reviewer evidence when the diff warrants it.

Follow `compose.md` for **compose**.

## Context

- **compose**: `git diff origin/main`, `.github/PULL_REQUEST_TEMPLATE.md`.
  For update, `gh pr view --json number,title,body`.
