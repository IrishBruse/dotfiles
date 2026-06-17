---
name: pr-fix
description: Fixes CI and GitHub Actions workflow failures on the current pull request. Use when PR checks fail, workflows are red, or the user asks to fix PR CI.
---

# PR Fix

Fix merge-blocking CI failures on the current pull request. Diagnose from the inlined workflow context, apply scoped code fixes, push, and re-check until checks pass or you hit a blocker.

## Context

When invoked from the `pr` command, the current PR, check rollup, failed job logs, and recent workflow runs are inlined in the prompt. Use that output as the latest state. Do not re-run git or gh to gather it.

If those sections are absent, run `gh pr checks` and `gh pr view --json statusCheckRollup`.

Use the failed check logs and `gh pr checks` output as the primary failure signals.

## Scope

- Fix CI issues caused by changes within this PR's scope.
- Never change CI checks or workflows just to make failures pass.
- Do not make unrelated code changes. If that would be required, stop and report back.
- For failures that look unrelated to this PR, check whether the branch is behind `origin/main` and merge or rebase latest changes before editing code. Another merged PR may have already fixed the same check on main.

## Workflow

1. Read failed checks and logs. Identify the first real error, not downstream noise.
2. Reproduce locally when practical (typecheck, lint, test, or the closest repo command).
3. Apply the smallest fix that addresses the root cause.
4. Commit, push, and watch CI with `gh pr checks --watch` until completed.
5. If new failures appear, repeat until checks pass or you are blocked.

## When checks already pass

If the prompt reports no failed checks, confirm with `gh pr checks`. When everything is green, say so briefly and stop. Do not invent fixes.

## Blockers

Stop and report when:

- failures need workflow or required-check changes
- the fix would require out-of-scope refactors
- logs are missing and local reproduction fails
- merge conflicts or merge state block CI and cannot be resolved safely
