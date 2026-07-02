# Jira Update

Use this route after `/jira update` or `/jira` has confirmed an existing issue needs cleanup, reformatting, splitting, parentage cleanup, or other hygiene edits that preserve the current issue type.

This route updates existing Jira issues only after investigation, an exact proposed change, and an `Approve` answer from the **Jira Write Approval Gate** in `SKILL.md`.

Issue type changes are out of scope for this route. The update route may report an issue type mismatch as hygiene, but it must never propose or perform a Jira write that changes `issuetype`.

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
   - Task: `task.md`.
   - Story: `story.md`.
   - Epic: `epic.md`.
6. Return a short recommendation and a precise proposed Jira change that preserves the current issue type.
7. Run the **Jira Write Approval Gate** in `SKILL.md` before editing Jira.
8. Only when the gate is answered `Approve`, call `editJiraIssue`, `createIssueLink`, `transitionJiraIssue`, or a comment tool for that exact approved change.
9. Refresh the local file per the same rule.
10. Reply with the issue key, browse URL, fields changed, and any follow-up hygiene still recommended.

## Update Recommendation Template

```markdown
## Recommendation
<One sentence describing whether to update, split, link, route type mismatch separately, or leave unchanged.>

## Ticket Hygiene
- <Finding or `No hygiene issues found.`>

## Proposed Jira Change
- Summary: <new summary or `unchanged`>
- Issue type: `unchanged` (required; do not change issue type in the update route)
- Parent: <new parent or `unchanged`>
- Feature Team: <new team or `unchanged`>
- Description: <exact replacement sections or focused patch summary>
- Links/comments/status: <exact change or `none`>
```

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
| Type mismatch | Issue type appears wrong | Surface the mismatch and route to a separate decision; do not change type in this route |
| Jira write | Any edit, link, transition, comment, or reparent | Stop and run the **Jira Write Approval Gate** in `SKILL.md`; write only on `Approve` |

## Do Not

- Do not edit Jira during the investigation step.
- Do not change issue type from the update route.
- Do not remove useful context to force a template.
- Do not create replacement tickets from this route unless the user confirms a downstream create route.
