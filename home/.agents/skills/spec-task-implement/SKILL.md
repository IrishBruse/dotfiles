---
name: spec-task-implement
description: >-
  Spec framework: implements numbered task specs in order, verifying after each task per project AGENTS.md.
  Invoke explicitly (/spec-task-implement). Use when working through specs/tasks or Task-*.md files in order.
disable-model-invocation: true
---

# Spec task implement

Execute written task specs sequentially. Each task is one unit of done when its acceptance criteria pass verify.

## Process

1. **Discover** - Read `spec-repo-shape` for task paths; read **agents** (`AGENTS.md`) for verify commands, dependency rules, and coding constraints. Optional `specs/README` for conventions.
2. **Locate tasks** - **task index** and **task spec** paths from `spec-repo-shape`, or path the user gave.
3. **Order** - Implement tasks in `spec-repo-shape` sort order (`Task-1`, `Task-2`, ...). Skip tasks already marked done unless user says redo.
4. **Per task:**
   - Read the full **task spec** file before coding.
   - Implement only what the task requires (no milestone scope creep).
   - Run verify from **agents** (`dotnet build`, `npm test`, `just test`, etc.).
   - Update task checkboxes or status lines only if the spec defines them.
5. **Stop** on task failure: fix or report blocker; do not start the next task until the current one verifies.
6. **Handoff** - After the last requested task, summarize what shipped and what remains in the **task index**.

## Related skills

- `spec-repo-shape` - paths and layout (read first).

## Rules

- Respect spec constraints (zero extra deps, file layout, naming) over general preferences.
- If code already satisfies a task, confirm against the spec, mark done, move on.
- Do not delete unrelated code; do not reformat outside the task scope.
- If a task file is missing but the index references it, stop and report.

## Edge cases

- **User names one task:** implement only that file; still verify.
- **Tasks overlap implemented code:** diff spec vs tree, implement the delta only.
- **Spec contradicts agents:** ask which wins before large edits.
