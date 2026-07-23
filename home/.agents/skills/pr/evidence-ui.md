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

Capture **prototype proof** screenshots for each new feature's reviewer-visible states:

- the main success / default state
- every reviewer-visible **error state** the diff adds or changes
  (validation failure, load failure, empty-after-error, access denied,
  switch/action failure, and similar)

For reviewer-visible minor UI changes, capture enough screenshots to show the changed state, including any new or changed error UI.

Save PNGs under a temp directory outside the git working tree, for example `/tmp/pr-ui-evidence/`.

**Prototype proof** is the markdown image URL returned by `gh image`.
Upload each PNG with `gh image` from the repo workspace and paste that returned markdown into the PR body:

```bash
gh image /tmp/pr-ui-evidence/example.png --repo owner/repo
```

Use only `gh image` output for image links.
Skip local paths, repo-relative assets, base64, manual uploads, and other hosts.

## Body placement

Add screenshots directly under the `##` section for the changed feature, immediately after the heading.
Use the feature name as the heading.
Put success-state proof first, then error-state proof for the same feature.
Put a short caption directly below each screenshot (name the state, for example `Error: unknown prototype id`).
Follow the caption with a paragraph and 1-3 bullets explaining the visible behavior.
For minor UI changes, include them under the related feature section or a specific heading such as
`## Account header review badge`.
Prefer visible behavior over file paths or invented UI.

## Done when

Every new reviewer-visible feature has real success-state and error-state screenshots captured in this session when those states exist in the diff.
Each image in the body is **prototype proof** from `gh image` (not a local or alternate URL).
Each image sits under the section for the changed feature and has a caption directly below it.
Skip UI evidence only when the diff has no reviewer-visible UI behavior.
Skip error-state proof only when the diff has no reviewer-visible error UI.
