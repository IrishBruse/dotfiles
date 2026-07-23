# PR body layout

Body layout for the `pr` skill.

## Contents

- [Readability standard](#readability-standard)
- [Body layout](#body-layout)
- [Summary](#summary)
- [Feature and API sections](#feature-and-api-sections)
- [Explanatory sections](#explanatory-sections)
- [Contract changes](#contract-changes-optional)
- [Exclusions](#exclusions)

## Readability standard

Write for an end user scanning the PR page, not for an implementation log.

- Keep the whole body compact.
  Prefer 35-60 lines at most unless the repo template requires more.
- Prefer short paragraphs and short bullets.
- Summarize the user-visible or reviewer-relevant outcome.
  Prefer a category label over a sentence when that is enough.

## Body layout

Unless the repo template says otherwise, use the following exact structure.

### Summary

Provide a 1-2 sentence explanation of the business or technical intent (the "why" and "what").
Follow this with a compact categorized rollup.

Each `Added`, `Changed`, or `Removed` line must be short and scannable:

- Use 2-6 words after the label.
- Include at most one item per category.
- Omit any category that has no meaningful item.
- Prefer outcomes over file names or implementation detail.

Examples:

- Added: Metadata audit fields
- Changed: Share enrichment flow
- Removed: Inline metadata parsing

### Feature and API sections

After `Summary`, create one `##` section per changed feature, workflow, or API surface.
Title each section by what changed, for example `## Prototype panel API` or `## Developer mode`.
Lead each section with the best reviewer evidence for that change, then explain it.

For UI changes, follow `evidence-ui.md` for capture and placement.
For API changes, follow `evidence-api.md` for capture and placement.

Layout shape:

```markdown
## Eligibility review panel

![<alt text>](<gh image URL>)
Success: review panel with approve and reject actions

![<alt text>](<gh image URL>)
Error: save failed with inline message

The panel lets reviewers approve or reject flagged accounts without leaving the account workflow.

- Shows risk reasons beside the review actions.
- Requires confirmation before rejection.
- Updates the account header after save.
```

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

### Explanatory sections

Create 0 to 3 extra sections when the summary and evidence-led sections do not explain the change fully.
Skip them when the summary already explains the change well.

- Start each section with a short, single lead sentence.
- Follow with 1-3 bullets on behavioral changes.
- Keep bullets to one line when possible.
- Prefer systemic behavior over file paths, line numbers, or churn.

### Contract changes (Optional)

Include when the diff changes schemas, API behavior, generated files, environment variables,
persisted data, deployment output, or externally consumed metadata. Otherwise omit.

- One lead sentence naming the external surface that changed.
- 1-3 bullets: inputs, outputs, compatibility, defaults, migrations, or generated artifacts.
- Text-only and brief.
  Put request/response examples in the API section, not here.

### Exclusions

Keep these out of the body: test checklists, TODOs, Jira metadata, generic `## Screenshots`
or `## API details` dump sections, and conversational filler.
