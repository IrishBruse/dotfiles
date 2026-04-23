**Default body layout** (use this unless `PULL_REQUEST_TEMPLATE.md` in the repo dictates a different structure—then align with that file and this section is guidance only).

1. **`## Summary`**
   **Exactly 2–3 lines** of plain-English _what_ and _why_ (audience: reviewers and future you)—no more. Put detail in the per-slice `##` sections below, not in Summary. If `diff.patch` is empty or trivial, state that in 2–3 lines and do not invent scope.

2. **One `##` heading per contained slice of work**
   For each distinct feature, subsystem, or coherent change set in the diff, add a section titled after that slice (e.g. `## Auth token handling`, `## Refactoring`). Under each heading, describe the changes that belong there—enough for a reviewer to map heading ↔ diff. Skip headings that would be one-line fillers; merge tiny related bits under one heading.

3. **Optional tail sections** (include only when they add real information; drop empty or redundant ones):
   - **`## Contract Changes`** — any contract changes that are worth calling out in the PR.

**PR description — do not:**

- **`## Summary` length** — do not go beyond **2–3 lines** in Summary (no extra paragraphs, sub-bullets, or “detail dumps” there—use the per-slice sections).
- **How to verify** — do not add verification steps, **Testing** / testing walkthroughs, command checklists, or “run `npm …`” blocks, including the same under other headings. When refreshing an existing PR (**`pr update`**), also **remove** such sections if the prefetched `PR.md` still has them.
- **Follow-ups / TODOs** — do not add loose follow-up lists, TODO lists, or task checklists in the body.
- **Jira / title validation meta** — do not mention Jira/PR title validation, missing issue key, NOVACORE title checks, previous title failed CI, or why the title was changed for a validator. Set a correct `#` title and describe the work; no meta about validators or title gate failures.
