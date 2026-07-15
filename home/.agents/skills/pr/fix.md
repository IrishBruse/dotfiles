# PR fix branch

Diagnose from inlined workflow and review context, apply scoped fixes, and push.
Re-check until checks pass and review feedback is addressed or you hit a blocker.

## Signals

Failed check logs and `gh pr checks` output are the primary CI signals.
Unresolved review threads are the primary review signals.

## Scope

- Fix CI issues caused by changes within this PR scope.
- Address valid unresolved review comments with scoped code or reply changes.
- Never change CI checks or workflows just to make failures pass.
- Do not make unrelated code changes.
  If that would be required, stop and report back.
- For failures that look unrelated to this PR, check whether the branch is behind `origin/main` and merge or rebase latest changes before editing code.
- For review comments, read the full thread before acting.
  Push back briefly when feedback is incorrect or out of scope instead of making a bad change.

## Workflow

### Step 1

Read failed checks, logs, and unresolved review threads.
Identify the first real issue to fix, not downstream noise.

**Done when:** the first root cause or valid review request is identified, or a blocker explains why it cannot be identified.

### Step 2

Reproduce CI failures locally when practical (typecheck, lint, test, or the closest repo command).

**Done when:** the failure reproduces locally, a closest local check has been run, or local reproduction is not practical and the reason is clear.

### Step 3

Apply the smallest fix that addresses the root cause or valid review feedback.

**Done when:** the change is scoped to the PR and addresses the identified root cause or review request.

### Step 4

Commit, push, and watch CI with `gh pr checks --watch` until completed.

**Done when:** the pushed branch includes the fix and required checks are green, or a blocker prevents green checks.

### Step 5

Resolve or reply to addressed review threads when the repo workflow expects it.

**Done when:** addressed threads are resolved or replied to, and unresolved threads are either still valid work or documented blockers.

### Step 6

If new failures or comments appear, repeat until checks pass and review feedback is handled or you are blocked.

**Done when:** checks are green and review feedback is handled, or the remaining work is blocked and reported.

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
