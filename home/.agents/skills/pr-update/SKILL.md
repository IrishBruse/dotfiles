---
name: pr-update
description: Updates an existing GitHub pull request title and body to match the current branch. Use when refreshing a PR description, updating PR metadata, or when the user says Update PR.
---

# PR Update

Refresh the current pull request's **title** and **body** so they match the branch as it is now, then apply them with `gh pr edit`.

## Gather context

Run these to understand the current state:

- `gh pr view --json number,title,body` - the PR as it exists on GitHub today.
- `git diff origin/main` - the source of truth for what ships.
- The repo PR template if present (e.g. `.github/pull_request_template.md`).

The diff is the source of truth for what ships. Use the current PR for what is on GitHub today, dropping stale sections that no longer apply. Align the body with the repo template when one is present.

## Readability standard

Write for an end user scanning the PR page, not for an implementation log.

- Keep the whole body compact. Prefer 35-60 lines at most unless the repo template requires more.
- Avoid walls of text. Use short paragraphs and short bullets.
- Do not turn diff inventory into prose. Summarize the user-visible or reviewer-relevant outcome.
- Prefer a few clear words over a sentence when a category label is enough.

## Body Layout

Unless the repo template says otherwise, use the following exact structure:

### Summary

Provide a 1-2 sentence explanation of the business or technical intent (the "why" and "what"). Follow this with a compact categorized rollup.

Each `Added`, `Changed`, or `Removed` line must be short and scannable:

- Use 2-6 words after the label.
- Include at most one item per category.
- Omit any category that has no meaningful item.
- Do not include implementation detail, file names, or full sentences here.

Examples:

- **Added:** Metadata audit fields
- **Changed:** Share enrichment flow
- **Removed:** Inline metadata parsing

### Topical ## Sections

Create 0 to 3 custom sections based on the functional areas touched by the diff (e.g., `## Database`, `## Authentication`, `## Frontend UI`). Skip topical sections entirely when the summary already explains the change well.

- Start each section with a short, single lead sentence explaining the goal of that area.
- Follow with 1-3 bullets detailing the specific behavioral changes.
- Keep bullets to one line when possible.
- Do not list file paths, line numbers, or raw code churn. Focus on systemic changes.

### Contract changes (Optional)

Include this section when the diff changes schemas, API behavior, generated files, environment variables, persisted data, deployment output, or externally consumed metadata. If none of those changed, omit it.

Keep it glanceable but technical:

- Use 1 lead sentence plus 1-3 bullets.
- Name the affected contract and the behavior change.
- Call out compatibility, default values, or migration impact when relevant.
- Avoid implementation walkthroughs.
- Write the lead sentence as a plain statement of which external surface changed.
- Write bullets as reviewer-facing facts about inputs, outputs, compatibility, defaults, migrations, or generated artifacts.
- Omit speculative impact and avoid naming unrelated contracts just to say they did not change.

### Exclusions

Do not include test checklists, TODOs, Jira metadata, or conversational filler (e.g., "In this PR, I fixed...").

## Apply

Compose the title (from the diff and branch, not invented scope) and the markdown body, then update the PR:

```bash
gh pr edit --title "<title>" --body "<body>"
```
