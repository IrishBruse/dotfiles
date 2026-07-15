# PR release branch

Merge-ready PR polish: draft proper, description accuracy, and reviewer evidence.

## Draft proper

If no open PR on the current branch:

- Follow the `pr` skill **compose** **create** path at `~/.agents/skills/pr/compose.md`.
- Create as a **draft** (`gh pr create --draft`).
- Fill title and body from the diff and repo PR template when present.

If a PR already exists:

- Confirm it is a draft with a real title and body (not placeholder text).
- Fill missing template sections from `.github/PULL_REQUEST_TEMPLATE.md` when present.

When `WORK=true`, require a `<PROJECT>-<ticket>` title prefix (valid recent Jira ticket), same as `pr` **compose** **update**.

Do not change draft status during this step.

**Done when:** an open draft PR exists with a non-placeholder title and body.

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
Do not pass `--draft` on update and do not change draft status here.
`gh pr ready` runs only after babysit in the calling workflow.

**Done when:** title and body accurately describe what ships in the diff.

## Evidence

Capture reviewer evidence for behavior that ships in the diff: API curls and UI screenshots only.

### API

Add API evidence only when the diff changes API behavior.
Use real `curl` calls (or equivalent HTTP requests) against the changed endpoints and capture request/response output from this session.

Do not put CI logs, test output, lint or build commands, dev-server logs, or other local check output in the PR body.

1. Run each API verification command and capture the real stdout from this session.
2. Build one `<details><summary>curl ...</summary>` block per request.
   Put the captured response inside a fenced code block.
3. Add the blocks to the PR body `Contract changes` section, then apply with `gh pr edit`.

Completion: every block maps to a curl you actually ran and captured this session.

### UI

Embed UI screenshots in the PR body for every new reviewer-visible feature.
Also capture reviewer-visible minor UI changes, including layout, visual state, or interaction tweaks.
Put them in the `## Screenshots` section.

Stop and report a blocker instead of faking evidence when:

- the app URL is missing and no local dev server is reachable
- the browser cannot load the app
- login, MFA, consent, or account choice blocks access
- a screenshot is blank, stale, or not from this session

1. Load and follow the `browser` skill before any browser work.
2. Resolve the target URL from the diff, running dev server, or user input.
3. Navigate and interact with `agent-browser`, then run `agent-browser screenshot <path>` for each new feature.
   Capture one screenshot for each feature's main reviewer-visible state.
4. Save each PNG under a temp directory outside the git working tree, for example `/tmp/pr-ui-evidence/`.
5. Upload each PNG with `gh image` and note the returned URL.
   Run from the repo workspace: `gh image /tmp/pr-ui-evidence/example.png --repo owner/repo`.
6. Add each screenshot to the PR body `## Screenshots` section.
   Each entry gets a short caption (route, state, interaction) followed by the image.
   Put minor UI changes in a `### Minor Changes` subsection at the bottom of `## Screenshots`.
   Do not include file paths, implementation detail, or invented UI.
7. Apply the body with `gh pr edit`.

**Done when:** every new reviewer-visible feature has a real screenshot captured this session.
Each image has a caption, and minor UI changes are grouped at the bottom when present.
API curl examples are in `Contract changes` when the diff changes API behavior.
Skip only the evidence types that have no reviewer-visible behavior to verify.
