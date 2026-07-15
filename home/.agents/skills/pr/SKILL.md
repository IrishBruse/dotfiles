---
name: pr
description: Create, update, or release the current GitHub pull request. Compose title and body, or run the release merge-ready pass.
---

# PR

Work on the current branch pull request.

Always run `gh pr view` immediately this will dictate wether you are create updating or readying the pr.

## Branch

- **compose** creates or updates a draft PR title and body.
  Use **update** within compose when a current PR section or `gh pr view` output is present.
  Otherwise use **create**.
- **release** is the final merge-ready pass.
  PR proper, code simplification, description accuracy, reviewer evidence, ready status, documented checks, push, babysit CI, and a PR link response.


Follow `~/.agents/skills/pr/compose.md` for **compose**.
Follow `~/.agents/skills/pr/release.md` for **release**.

## Context

- **compose**: run `git diff origin/main` and check `.github/PULL_REQUEST_TEMPLATE.md`.
  For update, also run `gh pr view --json number,title,body`.
- **release**: run `git diff origin/main`, `gh pr view --json number,title,body,url,isDraft`.
  Check `.github/PULL_REQUEST_TEMPLATE.md` when present.
