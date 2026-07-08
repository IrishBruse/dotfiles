# Jira Fields And MCP

Shared field conventions and Atlassian MCP create parameters for Task, Story, and Epic routes.

Resolve every custom field option id from `getJiraIssue` or a reference issue, never from memory. Do not invent option ids.

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
- Always include this in `additional_fields` for NOVACORE Epic creates.

## Atlassian MCP

Create with:

| Parameter | Value |
|-----------|-------|
| `cloudId` | From resources, user site, or Jira URL |
| `projectKey` | `NOVACORE` unless the user specifies otherwise |
| `issueTypeName` | `Task`, `Sub-task`, `Story`, or `Epic` per route |
| `summary` | Draft summary |
| `description` | Template body as markdown |
| `parent` | Epic key for Tasks and Stories when known; verified Initiative key for Epics; required parent issue key for Sub-tasks |
| `contentFormat` | `markdown` |
| `additional_fields` | Feature Team when known; Capitalizable for NOVACORE Epics; optional labels, priority, components |
