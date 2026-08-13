# PR compose branch

## Create or update

When `gh pr view` shows an open PR, **update** it.
When there is no open PR, **create** one, even if the user said "update".

`git diff origin/main...HEAD` is the source of truth for what ships.
When `.github/PULL_REQUEST_TEMPLATE.md` exists, fill it for the body.
On update, start from the current PR body.

If local uncommitted work belongs in the PR, resolve that with the user before apply.

## Title

Resolve the NOVACORE key and title with `title.md`, then apply that title on create and update.
Compose the summary half from the diff and branch, not invented scope.

## Body

Compose the body using the layout in `body-format.md`.
This skill owns format, Summary, and descriptions only.
Do not capture UI screenshots, run API curls, or upload `gh image` proof.

### Preserve proof on update

When updating an existing PR body:

1. Start from the current body returned by `gh pr view`.
2. Refresh Summary and descriptive text from the branch diff.
3. Keep every existing proof block unchanged:
   - markdown images (`![...](...)`), including `gh image` URLs
   - captions directly under those images
   - `<details><summary>curl ...</summary> ... </details>` blocks
4. Do not delete, rewrite, reorder, or regenerate those proof blocks once present.


## Snyk (create only)

Before the first `gh pr create`, look for a Snyk footprint: `.snyk`, a `snyk` package script,
or a documented repo Snyk command. Run `snyk test` when one exists.
If findings block the PR, add a 1-day ignore entry to the repo ignore file and note that in the reply.
Skip only when the repo has no Snyk footprint. On update, skip unless the user asks or new
dependency changes landed since the last create.

## Apply

Always create new PRs as **drafts**.
Leave draft status unchanged on update unless the user asks.

Before create, push the branch when it is ahead of or missing on the remote. A request to create
the PR authorizes this standard push.
Before update, push branch commits only when the user asked to publish them.

Create:

```bash
gh pr create --draft --base main --title "<title>" --body "<body>"
```

On a stacked branch, leave `--base` alone and let the `gh-stack` skill chain the bases.

Update:

```bash
gh pr edit --title "<title>" --body "<body>"
```

## Done when

**Create:** draft PR URL exists, title starts with a valid NOVACORE key from `title.md`,
body matches the branch diff layout in `body-format.md`,
and any local-only files were either included after user confirm or explicitly called out.

**Update:** existing PR title and descriptions match the branch diff, title still satisfies `title.md`,
existing proof blocks were preserved unchanged, no duplicate PR was created, and the PR URL was returned.
