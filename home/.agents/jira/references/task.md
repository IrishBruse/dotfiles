# Jira Task

Use this route after `/jira task`, `/jira subtask`, or `/jira` has confirmed the work should become a new internal Task or Sub-task.

Tasks and Sub-tasks are for discrete project work that is not user-facing Story work: enablement, setup, migration, documentation, security remediation, or platform plumbing. Sub-tasks use the same Goal / Acceptance Criteria / Notes format as Tasks; the only difference is Jira issue type and parent handling.

## Workflow

1. Collect inputs: `projectKey`, task intent, optional epic key, optional parent issue key for Sub-tasks, optional Feature Team, optional labels, priority, components, and references.
2. Clarify if vague. If intent is too thin to write a clear Goal and testable AC, ask targeted questions before drafting.
3. Parent prompt. For Tasks, if no epic key is in context, ask once: "Which epic should this task belong to? (e.g. NOVACORE-12345, or say skip)." Proceed without a parent if the user skips. For Sub-tasks, require a parent Story, Task, or Bug key before drafting or creating.
4. Feature Team. When an epic key or parent issue is known, fetch it and copy Feature Team if set. If absent, ask once for the team or accept a reference issue key to copy from.
5. Resolve `cloudId` from a Jira URL, prior context, or `getAccessibleAtlassianResources`.
6. Optional epic lookup. If the user gives an epic title instead of a key, use JQL and confirm the key before drafting.
7. Draft locally before any Jira create. Use the ticket template and workspace artifact conventions.
8. Stop gate. Show the draft file path and summary. Ask whether to keep it local or promote it.
9. Promote only after draft confirmation stop gate by calling `createJiraIssue`.
10. Reply with issue key, browse URL, epic, Feature Team, and summary. Update the local draft with the Jira key and link.

## Ticket Template

Use this markdown body for Jira description. Do not repeat the summary in the Goal.

```markdown
## Goal
<One sentence: what and why. Must not copy the summary verbatim.>

## Acceptance Criteria
- <Concrete, testable criterion>
- <...>

## Notes
<Optional. Omit this entire section when empty. Constraints, links, or context not already in Goal or AC.>
```

Summary line:

```text
<imperative verb> <object> [context]
```

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

## Local Draft

Save the draft using the workspace artifact conventions. Include this content shape:

```markdown
# <Title from summary>

**Jira:** _(pending)_
**Epic:** [NOVACORE-26881](https://globalization-partners.atlassian.net/browse/NOVACORE-26881) | none
**Parent:** [NOVACORE-12345](https://globalization-partners.atlassian.net/browse/NOVACORE-12345) | none
**Feature Team:** dynaFormRaptors | none
**Project:** NOVACORE

## Summary

<Imperative summary - same text sent to Jira `summary` field>

## Goal

...

## Acceptance Criteria

- ...

## Notes

...
```

Persist rules:

- Write before the draft confirmation stop gate.
- Re-read the file at the start of the create step. The file wins over chat if they differ.
- If the user edits the file during review, use the file content for `createJiraIssue`.

## Clarify Vague Requests

Ask before drafting when the request lacks enough detail to produce a specific Goal and at least one testable acceptance criterion.

Vague signals:

- One-liner with no outcome, such as "fix nav" or "do the thing".
- No clear what changes or done state.
- Missing repo, component, or user-visible behavior when that matters.
- You would need to guess acceptance criteria.

Ask only what is missing, for example:

- What should change, and for whom?
- What does done look like? How will we verify it?
- Which repo, area, or related ticket anchors this?
- Any constraints, flags, PBAC, or out-of-scope boundaries?

Do not invent filler AC or a generic Goal. Wait for answers, or accept "draft with what we have" and note gaps in Notes.

## Epic Association

- Preferred: set `parent` on `createJiraIssue` to the epic issue key.
- Ask once if epic is missing. It is not a blocker if the user skips.

## Sub-task Association

- Use this same Task route and template for Sub-tasks.
- Sub-tasks require `issueTypeName: "Sub-task"` and `parent` set to the parent Story, Task, or Bug key.
- Do not create an unparented Sub-task. If the parent is unknown, ask for it or route back to investigation.
- In local drafts, keep the same `## Goal`, `## Acceptance Criteria`, and optional `## Notes` sections. Record the parent in frontmatter or the local draft metadata.

## Feature Team And MCP

Read [`jira-fields.md`](jira-fields.md) for Feature Team, assignee, and `createJiraIssue` parameters. Use `issueTypeName: "Task"` or `"Sub-task"` when the user confirmed a Sub-task.

## Stop Gates

| Gate | When | Action |
|------|------|--------|
| Clarification | Intent too vague for Goal and AC | Ask targeted questions and stop until answered or user says draft anyway |
| Epic prompt | Epic missing at start | Ask once and proceed on skip |
| Sub-task parent | Sub-task parent missing | Ask for the parent issue key and stop until known |
| Draft confirmation | Before `createJiraIssue` | Save local draft and wait for explicit publish approval |

## Do Not

- Do not create without a local draft and draft confirmation stop gate.
- Do not put draft-only content only in Jira.
- Do not invent Goal, AC, or scope when the request is too vague.
- Do not use Story, Bug, or Sub-task unless the user explicitly overrides or confirms issue type.
- Do not pad the description with process notes, checklists, or duplicate summary text.
- Do not block indefinitely waiting for an epic after one prompt.
- Do not create an unparented Sub-task.
