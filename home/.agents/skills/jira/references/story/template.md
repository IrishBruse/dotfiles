# Story Templates

Templates for the Story route. See [`story.md`](story.md) for the workflow and rules.

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

## Summary Line

```text
<imperative verb> <actor-facing outcome> [context]
```

## Local Draft

Save the draft using the workspace artifact conventions in [`../local-draft.md`](../local-draft.md).

Path:

`jira/story/<parent title - NOVACORE-XXXXX>/<story title - NOVACORE-YYYYY>.md`

Before Jira create, omit the story key from the filename and use the draft title instead.

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
