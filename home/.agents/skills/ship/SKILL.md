---
name: ship
description: Final merge-ready pass for the current branch PR.
disable-model-invocation: true
---

# Ship

Last pass before merge: polish the draft PR, simplify the code, run documented checks, push, babysit CI, then reply with a Slack message only.

If a later step changes code, loop back to **Step 2** before push.

### Step 1: Draft PR proper

Follow **Step 1** in [`pr.md`](pr.md).

**Done when:** an open draft PR exists with a non-placeholder title and body.

### Step 2: Description accuracy

Follow **Step 2** in [`pr.md`](pr.md).
Compare title and body to `git diff origin/main`, fix drift, stale sections, invented scope, or missing contract changes.

**Done when:** title and body accurately describe what ships in the diff.

### Step 3: Code review / simplify

Read and follow the `code-review` skill on the branch diff.
Apply high-conviction simplifications in scope, skip nits that do not improve structure.

**Done when:** no unresolved structural issues from code-review remain.
If any remain, each must be justified as a PR review comment or PR body note, not in the final chat.

### Step 4: Extra checks

Read and follow [`checks.md`](checks.md).

**Done when:** every applicable documented check in the current repo has been run and passed.

### Step 5: Push

Commit any changes from steps 3-4 when there are changes.
Push the branch.

**Done when:** `git status` is clean and the remote branch includes all commits.

### Step 6: Babysit

Read and follow the `babysit` skill until the PR is mergeable, CI is green, and review comments are triaged.
If still a draft when babysit completes, run `gh pr ready`.

**Done when:** `gh pr view` shows mergeable and green checks, or you hit a blocker and report it instead of the Slack message.

### Step 7: Slack message

Read [`slack.md`](slack.md).
Your **entire chat response** is only the 1-2 line Slack message ending with the PR URL from `gh pr view --json url`.
No preamble, summary, or checklist unless babysit blocked.
