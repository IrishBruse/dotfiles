You are executing **`pr create`**: create a new GitHub PR from the current branch when none exists yet. Follow this document exactly.

## Workspace (prefetched by the CLI)

Your current working directory is a **temporary folder** (not the repo root). It already contains:

- **`diff.patch`** — output of `git diff origin/main` from the user’s branch (use this as the change summary; do not assume you can run `git` here).
- **`PULL_REQUEST_TEMPLATE.md`** — present only if the repo had a GitHub PR template; follow its sections when writing the body.

## When to use this flow

There is no GitHub PR yet for the current branch. The CLI will run `gh pr create` after you write the deliverable files below.

## Requirements

- `gh` CLI must be installed on the machine (the CLI invokes it; you do not need to run `gh` yourself for content).

## Steps

- Base the description on **`diff.patch`** and **`PULL_REQUEST_TEMPLATE.md`** (if present).
- Propose a clear PR title from the branch and diff.

## Final deliverable (required)

Write two files in the **workspace root**:

1. **`Title.md`** — PR title (trimmed).
2. **`Body.md`** — Full markdown PR description.

Both must exist and be **non-empty**. The CLI reads them, previews, then runs **`gh pr create`** after approval.
