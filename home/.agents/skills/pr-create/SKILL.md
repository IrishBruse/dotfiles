---
name: pr-create
description: Use when creating a new github PR (title/body) for the current branch
---

# PR Create

Open a new GitHub PR from the current branch against `origin/main`, composing the **title** and **body**, then create it with `gh pr create`.

## Gather context

Run these to understand the current state:

- `git diff origin/main` - the source of truth for what ships.
- The repo PR template if present (e.g. `.github/pull_request_template.md`).

The diff is the source of truth for what ships. Align the body with the repo template when one is present.

## Body Layout

Unless the repo template says otherwise, use the following exact structure:

### Summary

Provide a 1-2 sentence explanation of the business or technical intent (the "why" and "what"). Follow this with high-level bullets categorized exactly under these headers. Omit any category header if it contains zero items:

- **Added:** New capabilities, endpoints, or public surface area.
- **Removed:** Dropped behavior, deleted features, or removed surface area.
- **Changed:** Internal design shifts, modified logic, or database schema updates. Call out significant API or breaking changes here.

### 2-4 Topical ## Sections

Create 2 to 4 custom sections based on the functional areas touched by the diff (e.g., `## Database`, `## Authentication`, `## Frontend UI`).

- Start each section with a short, single lead sentence explaining the goal of that area.
- Follow with 2-5 bullet points detailing the specific behavioral changes.
- Do not list file paths, line numbers, or raw code churn. Focus on systemic changes.

### Contract changes (Optional)

Include this section only if consumers need migration details beyond the Summary callouts. If there are no breaking API changes, dependency updates, or contract modifications, omit this section entirely.

### Exclusions

Do not include test checklists, TODOs, Jira metadata, or conversational filler (e.g., "In this PR, I fixed...").

## Apply

Compose the title (from the diff and branch, not invented scope) and the markdown body, then create the PR:

```bash
gh pr create --base main --title "<title>" --body "<body>"
```
