# Jira Task

Use this route after `/jira task`, `/jira subtask`, or `/jira` has confirmed the work should become a new internal Task or Sub-task.

Tasks and Sub-tasks are for discrete project work that is not user-facing Story work: enablement, setup, migration, documentation, security remediation,
or platform plumbing.
Sub-tasks use the same Goal / Acceptance Criteria / Notes format as Tasks, the only difference is Jira issue type and parent handling.

## Workflow

1.
Collect inputs: project key, task intent, optional epic key, optional parent issue key for Sub-tasks, optional Feature Team, optional labels, priority,
components, and references.
2. Clarify if vague. Read `../clarify-vague.md`.
If intent is too thin to write a clear Goal and testable AC, ask targeted questions before drafting.
3. Parentage gate.
   **Tasks:** If no epic key is in context, ask once: "Which epic should this task belong to? (e.g.
NOVACORE-12345, or say skip)." Proceed without a parent if the user skips. When known, set the parent to the epic key.
   **Sub-tasks:** Require a parent Story, Task, or Bug key before drafting or creating. Create as a Sub-task issue type with a parent.
Do not create an unparented Sub-task. Record the parent in draft frontmatter or metadata. If the parent is unknown, ask for it or route back to investigation.
4. Feature Team. When an epic key or parent issue is known, fetch it and copy Feature Team if set.
If absent, ask once for the team or accept a reference issue key to copy from.
See `../jira-fields.md` for Feature Team, assignee, and create parameters.
5. Confirm the target Jira site from a Jira URL or prior context.
6. Optional epic lookup. If the user gives an epic title instead of a key, search Jira and confirm the key before drafting.
7. Draft locally before any Jira create. Read `../local-draft.md` and use the ticket template in `template.md`.
8. Run the **Jira Write Approval Gate**.
   Include the local draft path and summary in the gate `prompt`.
9. Promote only when the gate is answered `Approve` by creating the ticket with issue type `Task`, or `Sub-task` when the user confirmed a Sub-task.
10. Reply with issue key, browse URL, epic, Feature Team, and summary. Update the local draft with the Jira key and link.

## Writing Rules

| Rule | Requirement |
|------|-------------|
| Issue type | Always Task unless the user explicitly requests or confirms Sub-task |
| Summary length | <= 80 characters |
| Summary style | Imperative verb first, no issue key prefix, no trailing period |
| No repetition | Goal must add context beyond the summary and AC must not restate Goal |
| Acceptance criteria | Bullet list with observable and testable criteria |
| Notes | Omit when empty |
| Clarity | Enough context for any assignee to understand at a glance |

## Do Not

- Do not pad the description with process notes, checklists, or duplicate summary text.
- Do not use Story or Bug issue type unless the user explicitly overrides or confirms issue type.
- Do not block indefinitely waiting for an epic after one prompt.
