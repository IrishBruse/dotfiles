---
name: pr
description: Create, update, release, or fix the current GitHub pull request. Compose, polish for merge, or repair CI and review feedback.
---

# PR

Work on the current branch pull request: **compose** title and body, **release** for merge-ready polish, or **fix** merge-blocking CI and review feedback.

## Branch

Use **compose** when the prompt includes git diff, PR template, or current PR title and body for editing.
Use **update** within compose when a current PR section or `gh pr view` output is present.
Otherwise use **create**.
Use **release** for merge-ready PR polish: draft proper, description accuracy, and reviewer evidence.
Use **fix** when the prompt includes failed checks, workflow logs, or unresolved review threads.
Follow `~/.agents/skills/pr/compose.md` for the compose branch.
Follow `~/.agents/skills/pr/release.md` for the release branch.
Follow `~/.agents/skills/pr/fix.md` for the fix branch.

## Context

When prompt sections inline git state, open PRs, checks, workflow logs, review threads, or the PR template, use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent:

- **compose**: run `git diff origin/main`, check `.github/PULL_REQUEST_TEMPLATE.md`.
  For update, also run `gh pr view --json number,title,body`.
- **release**: run `git diff origin/main`, `gh pr view --json number,title,body,url,isDraft`.
  Check `.github/PULL_REQUEST_TEMPLATE.md` when present.
- **fix**: run `gh pr checks`, `gh pr view --json statusCheckRollup`, and fetch unresolved review threads with the GitHub GraphQL API.
