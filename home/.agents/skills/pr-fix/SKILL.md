---
name: pr-fix
description: Fix red CI checks and unresolved review comments on the current pull request.
disable-model-invocation: true
---

# PR Fix

Fix merge-blocking CI failures and unresolved review comments on the current pull request.
Diagnose from the inlined workflow and review context, apply scoped code fixes, push, and re-check until checks pass and review feedback is addressed or you hit a blocker.

## Context

When invoked from the `pr` command, the current PR, check rollup, failed job logs, recent workflow runs, and unresolved review threads are inlined in the prompt.
Use that output as the latest state.
Do not re-run git or gh to gather it.

If those sections are absent, run `gh pr checks`, `gh pr view --json statusCheckRollup`, and fetch unresolved review threads with the GitHub GraphQL API.

Use the failed check logs and `gh pr checks` output as the primary CI failure signals.
Use unresolved review threads as the primary review feedback signals.

## Scope

- Fix CI issues caused by changes within this PR's scope.
- Address valid unresolved review comments with scoped code or reply changes.
- Never change CI checks or workflows just to make failures pass.
- Do not make unrelated code changes.
  If that would be required, stop and report back.
- For failures that look unrelated to this PR, check whether the branch is behind `origin/main` and merge or rebase latest changes before editing code.
  Another merged PR may have already fixed the same check on main.
- For review comments, read the full thread before acting.
  Push back briefly when feedback is incorrect or out of scope instead of making a bad change.

## Workflow

1. Read failed checks, logs, and unresolved review threads.
  Identify the first real issue to fix, not downstream noise.
2. Reproduce CI failures locally when practical (typecheck, lint, test, or the closest repo command).
3. Apply the smallest fix that addresses the root cause or valid review feedback.
4. Commit, push, and watch CI with `gh pr checks --watch` until completed.
5. Resolve or reply to addressed review threads when the repo workflow expects it.
6. If new failures or comments appear, repeat until checks pass and review feedback is handled or you are blocked.

## When nothing needs fixing

If the prompt reports no failed checks and no unresolved review comments, confirm with `gh pr checks` and the PR review threads.
When everything is green and feedback is already handled, say so briefly and stop.
Do not invent fixes.

## Blockers

Stop and report when:

- failures need workflow or required-check changes
- the fix would require out-of-scope refactors
- logs are missing and local reproduction fails
- merge conflicts or merge state block CI and cannot be resolved safely
- review feedback conflicts with PR intent and needs a human decision
