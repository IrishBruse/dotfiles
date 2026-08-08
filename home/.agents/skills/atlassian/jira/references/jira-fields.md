# Jira Fields

Shared field conventions and create parameters for Task, Story, and Epic routes.

Resolve every custom field option id from the ticket itself or a reference issue, never from memory. Do not invent option ids.

## Assignee

Set Feature Team when known. Do not set an individual assignee.

## Feature Team

For NOVACORE, Feature Team is `customfield_10354` and expects option ids.

Known NOVACORE example:

```json
"customfield_10354": [{ "id": "16409" }]
```

`16409` is `dynaFormRaptors` on this site.

Resolve order when copying Feature Team:

- Task / Story: parent epic or parent issue when known, then ask once.
- Epic: parent Initiative, sibling Epic, then ask once.

## Capitalizable (Epic only)

NOVACORE rejects Epic creates without Capitalizable set.

- Field id: `customfield_10998`.
- Resolve in order: parent Initiative, sibling Epic, default to `Yes` id `15465`.
- Always include this on NOVACORE Epic creates.

## Create Parameters

Create with:

| Field | Value |
|-----------|-------|
| Site | From the user site or a Jira URL |
| Project | `NOVACORE` unless the user specifies otherwise |
| Issue type | `Task`, `Sub-task`, `Story`, or `Epic` per route |
| Summary | Draft summary |
| Description | Template body as markdown |
| Parent | Epic key for Tasks and Stories when known, verified Initiative key for Epics, required parent issue key for Sub-tasks |
| Content format | `markdown` |
| Additional fields | Feature Team when known, Capitalizable for NOVACORE Epics, optional labels, priority, components |
