# Ready

Last pass before merge: polish the PR, simplify the code, run documented checks, push, babysit CI, then reply with the PR link only.

If a step changes code, repeat description accuracy, evidence, checks, push, and babysit before the final response.

### Step 1: PR proper

If no open PR on the current branch:

- Follow the `pr` skill **compose** **create** path at `~/.agents/skills/pr/compose.md`.
- Create as a **draft** (`gh pr create --draft`).
- Fill title and body from the diff and repo PR template when present.

If a PR already exists:

- Confirm it has a real title and body (not placeholder text).
- Fill missing template sections from `.github/PULL_REQUEST_TEMPLATE.md` when present.

**Done when:** an open PR exists with a non-placeholder title and body.

### Step 2: Code review / simplify

Read and follow the `code-review` skill on the branch diff.
Apply high-conviction simplifications in scope, skip nits that do not improve structure.

**Done when:** no unresolved structural issues from code-review remain.
If any remain, each must be justified as a PR review comment or PR body note, not in the final chat.

### Step 3: Description accuracy

Gather state when not already inlined in the prompt:

- `git diff origin/main`
- `gh pr view --json number,title,body,url,isDraft`
- `.github/PULL_REQUEST_TEMPLATE.md` when present

The diff is the source of truth for what ships.
Drop stale body sections that no longer apply.

Compose title from the diff and branch, not invented scope.
Compose body layout per `~/.agents/skills/pr/body-format.md`.

Apply with `gh pr edit --title "<title>" --body "<body>"`.
Do not pass `--draft` on update.

**Done when:** title and body accurately describe what ships in the diff.

### Step 4: Evidence and ready status

Capture reviewer evidence for behavior that ships in the diff: API curls and UI screenshots only.

Follow `~/.agents/skills/pr/evidence-api.md` when the diff changes API behavior.
Follow `~/.agents/skills/pr/evidence-ui.md` when the diff includes reviewer-visible UI behavior.

Apply evidence with `gh pr edit` only.
Do not use PR comments for evidence.

**Done when:** API curl examples are under the changed API section when API behavior changed.
UI screenshots are under the changed feature section when reviewer-visible UI changed.
Skipped evidence types are not applicable to the diff.

If the PR is still a draft after PR proper, description accuracy, and evidence are complete, run `gh pr ready`.
Ready may mark the PR non-draft.

**Done when:** the PR is ready for review, or a blocker prevents marking it ready.

### Step 5: Repo checks

Scan the current repo for pre-merge commands in `package.json`, and CI workflows.
Run each check that applies to the diff.
Fix in-scope failures and stop to report blockers that need out-of-scope work.

**Done when:** every applicable check has passed, or you stopped to report a blocker.

### Step 6: Push

Commit any changes from earlier steps when there are changes.
Push the branch.

**Done when:** `git status` is clean and the remote branch includes all commits.

### Step 7: Babysit

Read and follow the `babysit` skill until the PR is mergeable, CI is green, and review comments are triaged.
If ready could not mark a draft PR earlier, run `gh pr ready` after babysit completes.

**Done when:** `gh pr view` shows mergeable and green checks, or you hit a blocker and report it instead of the PR link.

### Step 8: Response

Reply with just the PR link as the final message.

**Done when:** the entire chat response is only the PR URL from `gh pr view --json url`.
If babysit blocked, report the blocker instead of the PR link.
