---
name: jira-cli
description: Documents the human `jira` CLI and routes agent Jira work through Atlassian MCP. Use for local `jira/` files or live Jira data.
---

# Jira CLI

The `jira` command is a **human** tool for `./jira/` markdown.
Agents use **MCP** for live Jira work and never run `jira`, `acli`, or other Atlassian shell commands.

## Agent boundary

On an agent turn:

- **MCP** is the only remote Jira surface (`getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, and related Atlassian MCP tools).
- Never run `jira`, `acli`, or shell wrappers around them.
  The `jira` CLI rejects agent runs.
- Read existing files under `./jira/` when present.
  When a route needs a local pull or push, ask the user to run the matching **CLI** command below.
- Ticket workflow gates live in the `jira` skill.

## Human CLI

Local tickets live under `./jira/<type>/` as markdown with YAML frontmatter.

```sh
jira                       interactive browser (TTY only)
jira <KEY|URL>             fetch one ticket (Initiative/Epic: full tree)
jira pull [KEY|URL]        fetch one ticket, or all local tickets when omitted
jira sync                  same as jira pull
jira push [KEY]            push one ticket, or all local tickets when omitted
jira copy <KEY|URL> [dir]  copy ticket folder and descendants
jira board sync            refresh ~/.agents/skills/jira-board/ (dashboard cache)
```

Interactive keys in the TUI: `u` pull selected, `a` pull all, `s` push selected, `g` push all, `o` open in browser.

## MCP mapping

| Need | MCP |
| --- | --- |
| One issue by key | `getJiraIssue` |
| JQL search | `searchJiraIssuesUsingJql` |
| Projects and issue types | `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields` |
| Cloud/site id | `getAccessibleAtlassianResources` |
| Broad search | `searchAtlassian` |
| Create, edit, transition, link, comment | matching Atlassian MCP write tools after the `jira` skill **Jira Write Approval Gate** |

If MCP is unavailable, say so and stop.
Do not substitute `acli` or the `jira` CLI.
