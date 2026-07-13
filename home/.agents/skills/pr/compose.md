# PR compose branch

## Create or update

When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

For update, use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout inlined below from `body-format.md`.

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

## Evidence

### Api

Post terminal evidence as a PR comment when the diff has reviewer-visible behavior to verify (API responses, CLI output, dev-server logs).

1. Run each verification command and capture the real stdout from this session.
2. Build the comment body: one `<details><summary>command</summary>` block per command, with a fenced code block of the captured output inside.
3. Post it:

```bash
gh pr comment --body "<evidence>"
```

Skip this step when there is nothing to verify.

Completion: every block in the comment maps to output you actually ran and captured this session.


