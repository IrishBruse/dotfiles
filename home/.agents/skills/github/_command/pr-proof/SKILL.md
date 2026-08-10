---
name: pr-proof
description: "Append UI and API reviewer proof to the current PR body. Use when asked for PR proof, screenshots, gh image uploads, or API curl evidence."
disable-model-invocation: true
---

# PR proof

Add reviewer proof to the open PR on the current branch.
The `pr` skill owns title, Summary, and description layout.
This skill only captures proof and appends or fills it without rewriting the rest of the body.

## Preflight

```bash
gh pr view --json number,title,url,body
git diff origin/main...HEAD --stat
```

Stop if there is no open PR. Tell the user to run the `pr` skill first.

## What to capture

Capture proof for behavior that ships in the diff:

- UI screenshots: follow `evidence-ui.md`
- API curls: follow `evidence-api.md`

Skip a lane when the diff has no matching behavior.
Do not invent proof. Report blockers instead of faking captures.

## Append without wiping

1. Load the current PR body from `gh pr view`.
2. Keep every existing section, paragraph, bullet, image, and curl block that is already there.
3. Add missing proof under the matching `##` feature or API section.
   If that section is missing, append a new `##` section at the end using the layout in the `pr` skill `body-format.md`.
4. Never replace or rewrite existing `gh image` markdown, image captions, or `<details><summary>curl` blocks.
5. Never regenerate proof that is already present for the same feature or API case.
6. Apply with `gh pr edit --body "<body>"` (keep the existing title).

If the user explicitly asks to refresh or replace proof, then recapture only the named items and leave everything else unchanged.

## Done when

- Required UI and API proof for the diff is in the PR body, or correctly skipped with a reason
- Existing proof that was already on the PR is unchanged unless the user asked to refresh it
- The PR URL is returned
