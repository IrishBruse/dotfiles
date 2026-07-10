---
name: atlassian-cli
description: Runs the `jira` and `confluence` CLIs and Atlassian MCP. Use for local `jira/` or `confluence/` markdown or live Jira and Confluence data.
---

# Atlassian CLI

Use the `jira` or `confluence` CLI, or Atlassian MCP, for Jira and Confluence work.
Never run `acli` or other Atlassian shell wrappers.
Ticket workflow gates live in the `jira` skill.

## Surfaces

- **CLI** (`jira`, `confluence`) syncs local markdown against live issues and pages: pull, push, sync, and more.
- **MCP** reads, searches, and writes live Jira and Confluence directly, without local files.

Read existing files under `./jira/` and `./confluence/` before editing them.

## Jira CLI

Local tickets live under `./jira/<type>/` as markdown with YAML frontmatter.
Stories nest under their parent epic: `jira/story/<parent title - PROJ-XXXXX>/<story title - PROJ-YYYYY>.md`.

```sh
jira <KEY|URL>             fetch one ticket (Initiative/Epic: full tree)
jira pull [KEY|URL]        fetch one ticket, or all local tickets when omitted
jira sync                  same as jira pull
jira push [KEY]            push one ticket, or all local tickets when omitted
jira board sync            refresh ~/.agents/skills/jira-board/ (dashboard cache)
```

## Confluence CLI

Local pages live under `./confluence/` as markdown with YAML frontmatter (`id`, `title`, `version`, `url`, `syncedHash`, ...).

```sh
confluence <pageUrl|pageId>        same as confluence pull
confluence pull [pageUrl|pageId]   fetch one page tree, or all local pages when omitted
confluence push [pageId]           push one page, or all local pages when omitted
confluence sync <path.md>          pull or push one file from frontmatter state
confluence status                  show clean / modified / behind / links state
confluence verify                  fail if any relative .md links remain
```

Links in markdown must use full Confluence wiki URLs or Jira `/browse/KEY` URLs, not relative `.md` paths.

## MCP mapping

| Need | MCP |
| --- | --- |
| One issue by key | `getJiraIssue` |
| JQL search | `searchJiraIssuesUsingJql` |
| Projects and issue types | `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields` |
| One page by id | `getConfluencePage` |
| Child pages | `getConfluencePageDescendants` |
| CQL search | `searchConfluenceUsingCql` |
| Cloud/site id | `getAccessibleAtlassianResources` |
| Broad search | `searchAtlassian` |
| Create, edit, transition, link, comment (Jira) | matching Atlassian MCP write tools after the `jira` skill **Jira Write Approval Gate** |

If both CLI and MCP are unavailable, say so and stop.
Do not substitute `acli`.
