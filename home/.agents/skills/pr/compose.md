# PR compose branch

## Create or update

When `gh pr view` shows an open PR, **update** it.
When there is no open PR, **create** one.

`git diff origin/main` is the source of truth for what ships.
When `.github/PULL_REQUEST_TEMPLATE.md` exists, fill it for the body.
On update, start from the current PR body and drop stale sections.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout in `body-format.md`.

## Evidence

Capture reviewer evidence for behavior that ships in the diff: API curls and UI screenshots only.

Follow `evidence-api.md` when the diff changes API behavior.
Follow `evidence-ui.md` when the diff includes reviewer-visible UI behavior.
UI **prototype proof** must come from `gh image` URLs in the body.
Include error-state screenshots whenever the diff adds or changes reviewer-visible error UI.

Put evidence in the PR body on create and update.

## Apply

Always create new PRs as **drafts**.
Leave draft status unchanged on update unless the user asks.

Create:

```bash
gh pr create --draft --base main --title "<title>" --body "<body>"
```

Update:

```bash
gh pr edit --title "<title>" --body "<body>"
```

When evidence needs a second pass after create (for example uploaded screenshot URLs), apply it with `gh pr edit`.

## Done when

**Create:** draft PR URL exists, title and body match the branch diff, and required
evidence is in the body or correctly skipped.

**Update:** existing PR title and body match the branch diff, required evidence is in
the body or correctly skipped, and no duplicate PR was created.
