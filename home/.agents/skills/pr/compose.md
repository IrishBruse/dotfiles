# PR compose branch

## Create or update

When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

For update, use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout in `~/.agents/skills/pr/body-format.md`.

## Boundary

Do not capture API or UI evidence in compose.
When a PR update needs reviewer evidence, follow the `pr` skill **release** branch.

## Apply

Always create new PRs as **drafts**.
Do not pass `--draft` on update, and do not change draft status when editing an existing PR unless the user asks.

Create:

```bash
gh pr create --draft --base main --title "<title>" --body "<body>"
```

Update:

```bash
gh pr edit --title "<title>" --body "<body>"
```

## Done when

Create is done when the draft PR URL is available and the title and body match the branch diff.
Update is done when the existing PR title and body match the branch diff and no duplicate PR was created.
