# Epic Templates

Templates for the Epic route. See [`epic.md`](epic.md) for the workflow, writing rules, and Gherkin formatting requirements.

## Ticket Template

The Jira description uses three sections: Context, Expectations, and High-level Scenarios.

~~~markdown
## Context

<1-3 short paragraphs. What exists today, what changes, why it matters. Must reference how this epic advances the parent initiative's goal.>

## Expectations

- <Concrete expectation. Observable outcome.>
- <...>

## High-level Scenarios

```gherkin
Scenario: <short descriptive title>
  Given <precondition>
  And <precondition>
  When <event>
  Then <outcome>
  And <outcome>
```

```gherkin
Scenario: <short descriptive title>
  Given <precondition>
  When <event>
  Then <outcome>
```
~~~

## Summary Line

```text
<imperative verb> <object> [context]
```

## Local Draft

Save the draft using the workspace artifact conventions.

Every new Jira file must include frontmatter:

~~~markdown
---
title: "[NOVACORE] Epic title"
assigned: "None"
type: "Epic"
url: "None"
status: "draft"
project: "NOVACORE"
initiative: "NOVACORE-12345"
feature_team: "None"
---

## Summary

<Imperative summary - same text sent to Jira `summary` field>

---

<Context paragraphs - same text sent to Jira `description`>

## Expectations

- ...

## High-level Scenarios

```gherkin
Scenario: ...
  Given ...
  When ...
  Then ...
```
~~~
