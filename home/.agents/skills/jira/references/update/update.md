# Jira Update

Use this route after `/jira update` or `/jira` has confirmed an existing issue needs cleanup, reformatting, splitting,
parentage cleanup, or other hygiene edits that preserve the current issue type.

This route updates existing Jira issues only after investigation, an exact proposed change,
and an `Approve` answer from the **Jira Write Approval Gate** in `SKILL.md`.

Issue type changes are out of scope for this route.
The update route may report an issue type mismatch as hygiene, but it must never propose or perform a Jira write that changes `issuetype`.

## When To Use

Use when:

- An existing ticket is the right ticket, but its shape or content is stale.
- A ticket needs to match the current Task, Story, or Epic template.
- The issue type appears wrong and the ticket should be split, clarified, or routed to a separate type-change decision.
- Parent, Feature Team, labels, links, status notes, or acceptance criteria need cleanup.

Do not use when:

- The work should become a new Task, Story, or Epic instead.
- The ticket is too unclear to update responsibly without product input.
- The user has not approved the exact Jira write.

## Workflow

1. Collect the ticket key or URL and the cleanup request.
2. Ensure a local copy first per **Pull The Ticket Locally First** in `SKILL.md`.
3. Fetch the ticket from Jira, including issue type, status, parent, children, linked issues, labels, Feature Team, summary, and description.
4. Search local workspace context and artifacts for the key and nearby terms.
5. Identify the ticket's real issue type and compare it to the matching reference:
   - Task: `../task/task.md`.
   - Story: `../story/story.md`.
   - Epic: `../epic/epic.md`.
6. Return a short recommendation and a precise proposed Jira change that preserves the current issue type. Steps 1-6 are investigation only.
Do not perform any Jira write during investigation.
7. Run the **Jira Write Approval Gate** in `SKILL.md` with the exact proposed change.
8.
Only when the gate is answered `Approve`, apply that exact change: summary/description by editing the local file then publishing it,
other fields by the usual Jira update path (fields, transition, comment, link, ...).
9. Refresh the local file after writes that did not come from publishing the local file.
10. Reply with the issue key, browse URL, fields changed, and any follow-up hygiene still recommended.

## Update Recommendation Template

Use the Update Recommendation Template in `template.md`.

## Hygiene Checks

Check and report:

- Missing or wrong parent.
- Missing Feature Team.
- Vague or untestable acceptance criteria.
- Description format drift from the matching reference template.
- Issue type mismatch.
- Duplicate or overlapping sibling tickets.
- Stale implementation notes that belong in specs, plans, or docs instead of Jira.
- Missing repo, change folder, PR, or local artifact link when delivery is already underway.

## Preservation Rules

Preserve useful:

- Product context.
- Constraints.
- Links.
- Parentage unless the update explicitly changes it.
- Feature Team unless missing or clearly wrong.
- Labels, components, priority, fix versions, and other metadata unless the user asked to adjust them.
- Existing acceptance criteria that are still valid.
- Comments and history.

Do not overwrite a rich description with a thin template. Normalize and reorganize while keeping useful context.

## Split Or Type Mismatch

When the issue appears too broad, too small, or the wrong type:

1. Explain the mismatch.
2. Propose the safer shape as a recommendation only.
3. If splitting, list the proposed child tickets or replacement tickets without creating them.
4. Ask whether to proceed with child ticket drafting, a separate type-change route, or no change.

Do not change issue type in this route, even with approval. Do not change parent or summary without explicit approval for that exact change.

## Stop Gates

| Gate | When | Action |
|------|------|--------|
| Missing key | No ticket key or URL | Ask for the issue to update |
| Missing context | Cleanup request is too vague | Fetch ticket first, then ask targeted questions |
| Split risk | Ticket appears to need multiple issues | Present split proposal and wait |
| Type mismatch | Issue type appears wrong | Surface the mismatch and route to a separate decision, do not change type in this route |
