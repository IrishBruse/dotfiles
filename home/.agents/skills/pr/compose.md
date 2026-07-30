# PR compose branch

## Create or update

When `gh pr view` shows an open PR, **update** it.
When there is no open PR, **create** one, even if the user said "update".

`git diff origin/main...HEAD` is the source of truth for what ships.
When `.github/PULL_REQUEST_TEMPLATE.md` exists, fill it for the body.
On update, start from the current PR body and drop stale sections.

If local uncommitted work belongs in the PR, resolve that with the user before apply
(see preflight in `SKILL.md`).

## Title

Resolve the NOVACORE key and title with `title.md`, then apply that title on create and update.
Compose the summary half from the diff and branch, not invented scope.

## Body

Compose the body using the layout in `body-format.md`.

## Evidence

Capture reviewer evidence for behavior that ships in the diff: API curls and UI screenshots only.

Follow `evidence-api.md` when the diff changes API behavior.
Follow `evidence-ui.md` when the diff includes reviewer-visible UI behavior.
UI **prototype proof** must come from `gh image` URLs in the body.
Include error-state screenshots whenever the diff adds or changes reviewer-visible error UI.

Put evidence in the PR body on create and update.

## Snyk (create only)

Before the first `gh pr create`, run a local snyk test when the repo uses it.
If findings block the PR, add a 1-day ignore entry to the repo ignore file and note that in the reply.
Skip on update unless the user asks or new dependency changes landed since the last create.

## Apply

Always create new PRs as **drafts**.
Leave draft status unchanged on update unless the user asks.

Push the branch first when it is ahead of or missing on the remote.

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

**Create:** draft PR URL exists, title starts with a valid NOVACORE key from `title.md`,
body matches the branch diff, required evidence is in the body or correctly skipped,
and any local-only files were either included after user confirm or explicitly called out.

**Update:** existing PR title and body match the branch diff, title still satisfies `title.md`,
required evidence is in the body or correctly skipped, and no duplicate PR was created.
