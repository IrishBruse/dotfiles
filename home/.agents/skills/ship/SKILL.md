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

### Step 3: Evidence

Capture reviewer evidence for behavior that ships in the diff.

#### Terminal

Post terminal evidence as a PR comment when the diff has reviewer-visible behavior to verify.
Examples include API responses, CLI output, or dev-server logs.

1. Run each verification command and capture the real stdout from this session.
2. Build the comment body: one `<details><summary>command</summary>` block per command.
   Put the captured output inside a fenced code block.
3. Post it:

```bash
gh pr comment --body "<evidence>"
```

Completion: every block in the comment maps to output you actually ran and captured this session.

#### UI

Embed UI screenshots in the PR body for every new reviewer-visible feature.
Also capture reviewer-visible minor UI changes, including layout, visual state, or interaction tweaks.
Put them in the `## Screenshots` section.

Stop and report a blocker instead of faking evidence when:

- the app URL is missing and no local dev server is reachable
- the browser cannot load the app
- login, MFA, consent, or account choice blocks access
- a screenshot is blank, stale, or not from this session

1. Load and follow the `browser-use` skill before any browser work.
2. Resolve the target URL from the diff, running dev server, or user input.
3. Navigate and interact with `browser-use`, then call `capture_screenshot()` for each new feature.
   Capture one screenshot for each feature's main reviewer-visible state.
4. Save each PNG under a temp directory outside the git working tree, for example `/tmp/pr-ui-evidence/`.
5. Upload each PNG with the environment's supported GitHub image upload flow and note the returned URL.
6. Add each screenshot to the PR body `## Screenshots` section.
   Each entry gets a short caption (route, state, interaction) followed by the image.
   Put minor UI changes in a `### Minor Changes` subsection at the bottom of `## Screenshots`.
   Do not include file paths, implementation detail, or invented UI.
7. Apply the body with `gh pr edit`.

**Done when:** every new reviewer-visible feature has a real screenshot captured this session.
Each image has a caption, and minor UI changes are grouped at the bottom when present.
Terminal evidence is posted as a PR comment when applicable.
Skip only the evidence types that have no reviewer-visible behavior to verify.

### Step 4: Code review / simplify

Read and follow the `code-review` skill on the branch diff.
Apply high-conviction simplifications in scope, skip nits that do not improve structure.

**Done when:** no unresolved structural issues from code-review remain.
If any remain, each must be justified as a PR review comment or PR body note, not in the final chat.

### Step 5: Extra checks

Read and follow [`checks.md`](checks.md).

**Done when:** every applicable documented check in the current repo has been run and passed.

### Step 6: Push

Commit any changes from steps 4-5 when there are changes.
Push the branch.

**Done when:** `git status` is clean and the remote branch includes all commits.

### Step 7: Babysit

Read and follow the `babysit` skill until the PR is mergeable, CI is green, and review comments are triaged.
If still a draft when babysit completes, run `gh pr ready`.

**Done when:** `gh pr view` shows mergeable and green checks, or you hit a blocker and report it instead of the Slack message.

### Step 8: Slack message

Read [`slack.md`](slack.md).
Your **entire chat response** is only the 1-2 line Slack message ending with the PR URL from `gh pr view --json url`.
No preamble, summary, or checklist unless babysit blocked.
