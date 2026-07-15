---
name: atlassian-cli
description: Runs the `jira` and `confluence` CLIs and Confluence MCP. Use for local `jira/` or `confluence/` markdown or live Jira and Confluence data.
---

# Atlassian CLI

Use the `jira` or `confluence` CLI for Jira and Confluence work.
Use Atlassian MCP for Confluence reads and writes when the CLI is not enough.
Never run bare `acli`. Use `jira` or `jira acli` for Jira, and `confluence` for Confluence.
Ticket workflow gates live in the `jira` skill.

## Surfaces

- **Jira CLI** (`jira`) is the single surface for all Jira reads, searches, writes, and local markdown sync.
- **Confluence CLI** (`confluence`) syncs local markdown against live pages: pull, push, sync, and more.
- **Confluence MCP** reads, searches, and writes live Confluence directly, without local files.

Read existing files under `./jira/` and `./confluence/` before editing them.

## Jira CLI

Local tickets live under `./jira/<type>/` as markdown with YAML frontmatter.
Stories nest under their parent epic: `jira/story/<parent title - PROJ-XXXXX>/<story title - PROJ-YYYYY>.md`.

```sh
jira <KEY|URL>             fetch one ticket (Initiative/Epic: full tree)
jira pull [KEY|URL]        fetch one ticket, or all local tickets when omitted
jira sync                  same as jira pull
jira push [KEY]            push one ticket, or all local tickets when omitted
jira show <KEY|URL>        print one issue as JSON (no local file write)
jira search --jql "..."      search issues via JQL (JSON stdout)
jira create [flags]          create a work item (--from-draft, --from-json)
jira edit <KEY> [flags]      edit summary, description, or labels
jira transition <KEY>        transition status (--status required)
jira comment <KEY>           add a comment (--body-file or --body)
jira link                    link work items (--out, --in, --type)
jira projects                list visible projects (JSON stdout)
jira types <PROJECT>         list issue types for a project (JSON stdout)
jira board sync            refresh ~/.agents/skills/jira-board/ (dashboard cache)
jira acli <args...>          passthrough to acli jira STOP and ask for permission to run the command
```

Jira writes require the `jira` skill **Jira Write Approval Gate** before running `jira create`, `jira edit`, `jira transition`, `jira comment`, or `jira link`.

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

## Confluence MCP mapping

| Need | MCP |
| --- | --- |
| One page by id | `getConfluencePage` |
| Child pages | `getConfluencePageDescendants` |
| CQL search | `searchConfluenceUsingCql` |
| Cloud/site id | `getAccessibleAtlassianResources` |
| Broad search | `searchAtlassian` |
| Create, edit, publish (Confluence) | matching Atlassian MCP write tools |

If the Jira CLI is unavailable, say so and stop for Jira work.
If both Confluence CLI and MCP are unavailable, say so and stop for Confluence work.
Do not substitute bare `acli`.
