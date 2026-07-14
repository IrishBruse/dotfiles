# PR compose branch

## Create or update

When existing open PRs is not `none`, edit that PR instead of creating a duplicate.

The `git diff origin/main` section is the source of truth for what ships.
When the repo PR template is not `none`, fill it in for the body.

For update, use the current PR section for what is on GitHub today, dropping stale sections that no longer apply.

## Body

Compose the title from the diff and branch, not invented scope.
Compose the body using the layout inlined below from `body-format.md`.

## Update UI evidence

For update, refresh `## Screenshots` when the diff includes new reviewer-visible UI features or minor UI changes.
Skip this section when the diff has no reviewer-visible UI behavior.

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
