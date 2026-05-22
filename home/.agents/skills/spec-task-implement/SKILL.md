---
name: spec-task-implement
description: >-
  Implements numbered task specs in order from a specs directory, verifying after each task per project AGENTS.md.
  Use when the user says implement specs/tasks, work through milestone tasks, or points at Task-*.md files in order.
---

# Spec-task implement

Execute written task specs sequentially. Each task is one unit of done when its acceptance criteria pass verify.

## Process

1. **Discover** - Read `AGENTS.md` (or `specs/README`) for verify commands, dependency rules, and coding constraints.
2. **Locate tasks** - Default: `specs/tasks/` or path the user gave. Find index file (`Milestone_1.md`, `README`) if present for order.
3. **Order** - Implement `Task-1`, `Task-2`, ... or numbered files in sort order. Skip tasks already marked done in the spec unless user says redo.
4. **Per task:**
   - Read the full task file before coding.
   - Implement only what the task requires (no milestone scope creep).
   - Run verify from AGENTS.md (`dotnet build`, `npm test`, `just test`, etc.).
   - Update task checkboxes or status lines only if the spec defines them.
5. **Stop** on task failure: fix or report blocker; do not start the next task until the current one verifies.
6. **Handoff** - After the last requested task, summarize what shipped and what remains in the milestone index.

## Rules

- Respect spec constraints (zero extra deps, file layout, naming) over general preferences.
- If code already satisfies a task, confirm against the spec, mark done, move on.
- Do not delete unrelated code; do not reformat outside the task scope.
- If a task file is missing but the index references it, stop and report.

## Edge cases

- **User names one task:** implement only that file; still verify.
- **Tasks overlap implemented code:** diff spec vs tree, implement the delta only.
- **Spec contradicts AGENTS.md:** ask which wins before large edits.
