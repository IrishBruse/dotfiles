---
name: pr
description: Create, update, or release the current GitHub pull request. Compose or polish for merge.
---

# PR

Work on the current branch pull request.

## Branch

- **compose** creates or updates a draft PR title and body.
  Use **update** within compose when a current PR section or `gh pr view` output is present.
  Otherwise use **create**.
- **release** polishes a PR for merge: PR proper, description accuracy, reviewer evidence, and ready status.

Follow `~/.agents/skills/pr/compose.md` for **compose**.
Follow `~/.agents/skills/pr/release.md` for **release**.

## Context

When prompt sections inline git state, open PRs, checks, workflow logs, review threads, or the PR template, use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent:

- **compose**: run `git diff origin/main` and check `.github/PULL_REQUEST_TEMPLATE.md`.
  For update, also run `gh pr view --json number,title,body`.
- **release**: run `git diff origin/main`, `gh pr view --json number,title,body,url,isDraft`.
  Check `.github/PULL_REQUEST_TEMPLATE.md` when present.
