---
name: push
description: Lint, Snyk when relevant, commit, and push the current work.
---

# Push

Lint, Snyk when relevant, then commit and push. Invoking this skill is approval for all of that.

Do not ask the user to confirm `main` or `master`. Skip the remote push only when the current branch is protected.

### Step 1: Lint

Find the repo lint command (`package.json` scripts `lint` / `lint:fix`, a Makefile target, or the language default).
Run it. Fix findings. Re-run until exit 0.
If none exists, say so and continue.

Done when lint exits 0, or when no lint command exists.

### Step 2: Snyk (Optional)

Look for a Snyk footprint: `.snyk`, a `snyk` package script, or a documented repo Snyk command.
Run `snyk test` when one exists. Skip when none exists.
If findings block, add a 1-day ignore to the repo ignore file and include it in the commit.

Done when `snyk test` has run, or when there is no footprint.

### Step 3: Commit

Run `just push` when the repo Justfile has a `push` recipe. Otherwise run `push`.

That CLI splits commits with `commit.config.json` and writes subjects from the diff and recent `git log` (action, not file lists). It also runs `git push -u origin HEAD` — only use it when the branch is not protected (see Step 4). When the branch is protected, commit another way and skip the remote push.

If neither command exists:

1. Survey: `git status -sb`, `git diff`, `git diff --cached`, `git log -8 --oneline`
2. Stage named paths only. Leave secrets unstaged and warn once.
3. Commit with a HEREDOC subject that matches recent `git log` (why, not what).
4. On hook failure: fix, then a new commit.

Done when the current work is on `HEAD`.

### Step 4: Push

Check branch protection, then push. Do not ask about `main` / `master`.

```bash
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
branch=$(git rev-parse --abbrev-ref HEAD)
protected=$(gh api "repos/${repo}/branches/${branch}" --jq .protected)
```

If `protected` is `true`, skip the push and report that the branch is protected. Lint and commit still run.

If the check fails (no `gh`, not a GitHub remote), push as usual.

```bash
git push -u origin HEAD
```

Skip this step when Step 3 already pushed and `git status -sb` shows the branch is up to date with origin.

Done when `git status -sb` shows the branch is up to date with origin, or when the push was skipped because the branch is protected.

### Report

New subjects, the tracking line, Snyk result, and anything still dirty.
