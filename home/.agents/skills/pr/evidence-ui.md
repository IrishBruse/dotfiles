# PR UI evidence

Use UI evidence when the diff adds new reviewer-visible UI behavior or changes visible layout, state, or interaction.

## Capture

Load and follow the `browser` skill before any browser work.
Resolve the target URL from the diff, running dev server, or user input.

Stop and report a blocker instead of faking evidence when:

- the app URL is missing and no local dev server is reachable
- the browser cannot load the app
- login, MFA, consent, or account choice blocks access
- a screenshot is blank, stale, or not from this session

Capture one screenshot for each new feature's main reviewer-visible state.
For reviewer-visible minor UI changes, capture enough screenshots to show the changed state.

Save PNGs under a temp directory outside the git working tree, for example `/tmp/pr-ui-evidence/`.
Upload each PNG with `gh image` and note the returned URL.
Run from the repo workspace:

```bash
gh image /tmp/pr-ui-evidence/example.png --repo owner/repo
```

## Body placement

Add screenshots directly under the `##` section for the changed feature, immediately after the heading.
Use the feature name as the heading, not `## Screenshots`.
Put a short caption directly below each screenshot.
Follow the caption with a paragraph and 1-3 bullets explaining the visible behavior.
For minor UI changes, either include them under the related feature section or use a specific heading such as `## Account header review badge`.
Do not include file paths, implementation detail, or invented UI.

Apply the updated body with `gh pr edit`.

## Done when

Every new reviewer-visible feature has a real screenshot captured in this session.
Each image sits under the section for the changed feature and has a caption directly below it.
Skip UI evidence only when the diff has no reviewer-visible UI behavior.
