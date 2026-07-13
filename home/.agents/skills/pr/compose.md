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

### UI

Embed UI screenshots in the PR body when the diff has reviewer-visible UI behavior to verify.
Examples include layout, visual state, interactions, or screenshots requested by the user.
Put them in the `## Screenshots` section per `body-format.md`.

Skip this step when there is no UI behavior to verify.

Stop and report a blocker instead of faking evidence when:

- the app URL is missing and no local dev server is reachable
- the browser cannot load the app
- login, MFA, consent, or account choice blocks access
- a screenshot is blank, stale, or not from this session

1. Load and follow the `browser-use` skill before any browser work.
2. Resolve the target URL from the diff, running dev server, or user input.
3. Navigate and interact with `browser-use`, then call `capture_screenshot()` for each reviewer-relevant state.
4. Save each PNG under a temp directory outside the git working tree, for example `/tmp/pr-ui-evidence/`.
5. Upload each PNG with the environment's supported GitHub image upload flow and note the returned URL.
6. Add each screenshot to the PR body `## Screenshots` section.
   Each entry gets a short caption (route, state, interaction) followed by the image.
   Do not include file paths, implementation detail, or invented UI.
7. Apply the body with `gh pr create` or `gh pr edit` as described above.

Completion: every image in the PR body is a real screenshot captured this session, and each has a caption.
The `## Screenshots` section is empty only when there is no UI behavior to verify.
