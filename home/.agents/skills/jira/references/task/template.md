# Task Templates

Templates for the Task and Sub-task route. See `task.md` for the workflow and rules.

## Ticket Template

Use this markdown body for the Jira description. Do not repeat the summary in the Goal.

```markdown
## Goal
<One sentence: what and why. Must not copy the summary verbatim.>

## Acceptance Criteria
- <Concrete, testable criterion>
- <...>

## Notes
<Optional. Omit this entire section when empty. Constraints, links, or context not already in Goal or AC.>
```

## Summary Line

```text
<imperative verb> <object> [context]
```

## Local Draft

Save the draft using the workspace artifact conventions.

Every new Jira file must include frontmatter:

```markdown
---
title: "[NOVACORE] Task title"
assigned: "None"
type: "Task"
url: "None"
status: "draft"
project: "NOVACORE"
epic: "NOVACORE-26881"
parent: "None"
feature_team: "None"
---

## Summary

<Imperative summary - same text sent to Jira `summary` field>

## Goal

...

## Acceptance Criteria

- ...

## Notes

...
```
