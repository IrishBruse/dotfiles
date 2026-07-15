# PR release branch

Merge-ready PR polish: PR proper, description accuracy, reviewer evidence, and ready status.

## PR proper

If no open PR on the current branch:

- Follow the `pr` skill **compose** **create** path at `~/.agents/skills/pr/compose.md`.
- Create as a **draft** (`gh pr create --draft`).
- Fill title and body from the diff and repo PR template when present.

If a PR already exists:

- Confirm it has a real title and body (not placeholder text).
- Fill missing template sections from `.github/PULL_REQUEST_TEMPLATE.md` when present.

**Done when:** an open PR exists with a non-placeholder title and body.

## Description accuracy

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

## Evidence

Capture reviewer evidence for behavior that ships in the diff: API curls and UI screenshots only.

Follow `~/.agents/skills/pr/evidence-api.md` when the diff changes API behavior.
Follow `~/.agents/skills/pr/evidence-ui.md` when the diff includes reviewer-visible UI behavior.

Apply evidence with `gh pr edit` only.
Do not use PR comments for evidence.

**Done when:** API curl examples are under the changed API section when API behavior changed.
UI screenshots are under the changed feature section when reviewer-visible UI changed.
Skipped evidence types are not applicable to the diff.

## Ready status

If the PR is still a draft after PR proper, description accuracy, and evidence are complete, run `gh pr ready`.
Release is allowed to mark the PR as non-draft.

**Done when:** the PR is ready for review, or a blocker prevents marking it ready.
