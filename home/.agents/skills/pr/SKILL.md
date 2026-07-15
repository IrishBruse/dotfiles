---
name: pr
description: Create, update, or ready the current GitHub pull request. Compose title and body, or run the merge-ready pass.
---

# PR

Work on the current branch pull request.

Run `gh pr view` first. No open PR routes **compose** **create**; an open PR routes **compose** **update** or **ready**.

## Branches

- **compose**: draft PR title and body.
- **ready**: merge-ready pass: PR proper, simplify code, description accuracy, reviewer evidence, documented checks, push, babysit CI, PR link response.

Follow `~/.agents/skills/pr/compose.md` for **compose**.
Follow `~/.agents/skills/pr/ready.md` for **ready**.

## Context

- **compose**: `git diff origin/main`, `.github/PULL_REQUEST_TEMPLATE.md`. For update, `gh pr view --json number,title,body`.
- **ready**: `git diff origin/main`, `gh pr view --json number,title,body,url,isDraft`, PR template when present.
