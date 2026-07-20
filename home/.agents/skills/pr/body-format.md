# PR body layout

Body layout for the `pr` skill.

## Contents

- [Readability standard](#readability-standard)
- [Body Layout](#body-layout)
- [Eligibility review panel](#eligibility-review-panel)
- [Eligibility review API](#eligibility-review-api)

## Readability standard

Write for an end user scanning the PR page, not for an implementation log.

- Keep the whole body compact.
  Prefer 35-60 lines at most unless the repo template requires more.
- Avoid walls of text.
  Use short paragraphs and short bullets.
- Do not turn diff inventory into prose.
  Summarize the user-visible or reviewer-relevant outcome.
- Prefer a few clear words over a sentence when a category label is enough.

## Body Layout

Unless the repo template says otherwise, use the following exact structure:

### Summary

Provide a 1-2 sentence explanation of the business or technical intent (the "why" and "what").
Follow this with a compact categorized rollup.

Each `Added`, `Changed`, or `Removed` line must be short and scannable:

- Use 2-6 words after the label.
- Include at most one item per category.
- Omit any category that has no meaningful item.
- Do not include implementation detail, file names, or full sentences here.

Examples:

- Added: Metadata audit fields
- Changed: Share enrichment flow
- Removed: Inline metadata parsing

### Feature And API ## Sections

After `Summary`, create one `##` section per changed feature, workflow, or API surface.
Title each section by what changed, for example `## Prototype panel API` or `## Developer mode`.
Do not use generic evidence headings like `## Screenshots` or `## API details`.

Each section should lead with the best reviewer evidence for that change, then explain it.
For UI changes, put the screenshot directly under the section title.
Put a short caption directly below each screenshot.
Follow the caption with a short paragraph and 1-3 bullets explaining the behavior.

```markdown
## Eligibility review panel

![<alt text>](<uploaded image URL>)
<short caption>

The panel lets reviewers approve or reject flagged accounts without leaving the account workflow.

- Shows risk reasons beside the review actions.
- Requires confirmation before rejection.
- Updates the account header after save.
```

For API behavior changes, put the captured request/response details directly under the API section title.
Follow the details with a short paragraph and 1-3 bullets explaining the behavior.
Use real examples captured from this branch, not test commands or generic verification output.

````markdown
## Eligibility review API

<details><summary>curl ...</summary>

```json
<captured response>
```

</details>

The API records the review decision and exposes the latest review status to account workflows.

- `POST` creates the latest decision.
- `GET` returns the current review state.
````

### Explanatory ## Sections

Create 0 to 3 extra sections when the summary and evidence-led sections do not explain the change fully.
Skip topical sections entirely when the summary already explains the change well.

- Start each section with a short, single lead sentence explaining the goal of that area.
- Follow with 1-3 bullets detailing the specific behavioral changes.
- Keep bullets to one line when possible.
- Do not list file paths, line numbers, or raw code churn.
  Focus on systemic changes.

### Contract changes (Optional)

Include this section when the diff changes schemas, API behavior, generated files, environment variables,
persisted data, deployment output, or externally consumed metadata.
If none of those changed, omit it.

Keep it glanceable but technical:

- Use 1 lead sentence plus 1-3 bullets.
- Name the affected contract and the behavior change.
- Call out compatibility, default values, or migration impact when relevant.
- Avoid implementation walkthroughs.
- Write the lead sentence as a plain statement of which external surface changed.
- Write bullets as reviewer-facing facts about inputs, outputs, compatibility, defaults, migrations, or generated artifacts.
- Omit speculative impact and avoid naming unrelated contracts just to say they did not change.
- Keep this section text-only and brief.
- Put API request/response examples in the relevant API section, not in `Contract changes`.

### Exclusions

Do not include test checklists, TODOs, Jira metadata, generic `## Screenshots` sections,
generic `## API details` sections, or conversational filler (e.g., "In this PR, I fixed...").
