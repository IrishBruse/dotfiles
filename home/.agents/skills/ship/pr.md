# Ship PR steps

Steps 1 and 2 of the `ship` skill.

## Step 1: Draft PR proper

If no open PR on the current branch:

- Follow the `pr` skill **compose** **create** path at `~/.agents/skills/pr/compose.md`.
- Create as a **draft** (`gh pr create --draft`).
- Fill title and body from the diff and repo PR template when present.

If a PR already exists:

- Confirm it is a draft with a real title and body (not placeholder text).
- Fill missing template sections from `.github/PULL_REQUEST_TEMPLATE.md` when present.

When `WORK=true`, require a `<PROJECT>-<ticket>` title prefix (valid recent Jira ticket), same as `pr update`.

Do not change draft status during this step.

## Step 2: Description accuracy

Gather state when not already inlined in the prompt:

- `git diff origin/main`
- `gh pr view --json number,title,body,url,isDraft`
- `.github/PULL_REQUEST_TEMPLATE.md` when present

The diff is the source of truth for what ships.
Drop stale body sections that no longer apply.

Compose title from the diff and branch, not invented scope.
Compose body layout per `~/.agents/skills/pr/body-format.md`.

Apply with `gh pr edit --title "<title>" --body "<body>"`.
Do not pass `--draft` on update and do not change draft status here.
`gh pr ready` runs only after babysit in step 6.
