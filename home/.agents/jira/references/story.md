# Jira Story

Use this route after `/jira story` or `/jira` has confirmed the work should become a new actor-facing Story.

Stories are for actor-facing delivery slices that can be specified with a user story, scope, acceptance criteria, and explicit out-of-scope boundaries. Use `task.md` for internal chores with no actor-facing behavior. Use `epic.md` for broader outcomes under an Initiative.

## Workflow

1. Collect inputs: project key, story intent, parent epic key, optional Feature Team, labels, dependencies, references, relevant repositories, and developer-facing context.
2. Parent epic gate. Ask once for the epic when missing. The user may say `skip`.
3. Fetch parent when known. Confirm the parent, read summary/context, and copy Feature Team when available.
4. Clarify if vague. If actor, outcome, scope, or testable acceptance criteria are unclear, ask targeted questions before drafting.
5. Draft locally before Jira create using workspace artifact conventions.
6. Show the draft file path and summary, then run the **Jira Write Approval Gate** in `SKILL.md`.
7. Promote only when the gate is answered `Approve` by creating the Jira Story with `contentFormat: "markdown"` and the parent epic when known.
8. Update the local record with Jira key, URL, and status. Update local hierarchy context when the parent epic is known.

## Ticket Template

Use this markdown body for Jira descriptions:

```markdown
## User Story

**As a** <actor>,
**I want** <capability or behavior>,
**So that** <outcome or value>.

## Scope

<Short paragraph or bullets describing what is included.>

## Acceptance Criteria

- <Concrete, observable criterion>
- <Another testable criterion>

## Out Of Scope

- <Explicit exclusion>

## Developer Notes

- Relevant repos: <repo names, or `TBD`>
- Related docs / specs: <links or local paths, or `None known`>
- Possibly relevant implementation context: <constraints, patterns, dependencies, or `None known`>

## Open Questions

- <Question that should not block story creation, or omit this section>
```

Summary line:

```text
<imperative verb> <actor-facing outcome> [context]
```

## Writing Rules

| Rule | Requirement |
|------|-------------|
| Issue type | Always Story unless the user explicitly requests another type |
| Summary length | <= 80 characters |
| Summary style | Imperative verb first, no issue key prefix, no trailing period |
| Actor | Prefer a human GP role or named external actor |
| Scope | Concrete enough to separate this story from sibling stories |
| Acceptance criteria | Bullets only, each one observable and testable |
| Out of scope | Required when related sibling stories or deferred slices exist |
| Developer notes | Include likely repos, docs, patterns, dependencies, and constraints. Mark uncertain items as `TBD` |
| Jira keys | Allowed in metadata and prose references. Do not put Jira keys inside Gherkin bodies |

System-only stories need explicit justification.

## Local Draft

Save the draft using the workspace artifact conventions.

Every new Jira file must include frontmatter:

```markdown
---
title: "[NOVACORE] Story title"
assigned: "None"
type: "Story"
url: "None"
status: "draft"
project: "NOVACORE"
parent: "NOVACORE-12345"
feature_team: "None"
---
```

## Clarify Vague Requests

Ask before drafting when any of these are missing:

- The actor or audience.
- The behavior that changes.
- What done looks like.
- The parent epic or delivery context when it affects scope.
- Boundaries between this story and sibling work.

Good questions:

- Who is the actor for this story?
- What outcome should they get when this is done?
- Which epic should this roll up to?
- What is explicitly out of scope for this slice?
- Should detailed scenarios live in this ticket or a separate artifact?

Do not invent acceptance criteria to fill gaps. If the user says "draft with what we have", record gaps under Open Questions.

## Feature Team And MCP

Read [`jira-fields.md`](jira-fields.md) for Feature Team, assignee, and `createJiraIssue` parameters. Use `issueTypeName: "Story"`.

## Stop Gates

| Gate | When | Action |
|------|------|--------|
| Parent epic | Missing parent | Ask once. Proceed only if user provides a key or says skip |
| Clarification | Intent too vague | Ask targeted questions and stop until answered or user says draft anyway |
| Jira write | Before Jira create | Save local draft, then run the **Jira Write Approval Gate** in `SKILL.md`; create only on `Approve` |

## Do Not

- Do not create Jira without a local draft.
- Do not use Story for non-behavioral internal chores. Use `task.md`.
- Do not copy implementation plans into the story body.
- Do not put large scenario sets in Jira when a separate artifact is the source of truth.
