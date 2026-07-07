---
name: confluence-cli
description: Documents the human `confluence` CLI and routes agent Confluence work through Atlassian MCP. Use for local `confluence/` files or live Confluence data.
---

# Confluence CLI

The `confluence` command is a **human** tool for `./confluence/` markdown.
Agents use **MCP** for live Confluence work and never run `confluence`, `acli`, or other Atlassian shell commands.

## Agent boundary

On an agent turn:

- **MCP** is the only remote Confluence surface.
  Use `getConfluencePage`, `getConfluencePageDescendants`, `searchConfluenceUsingCql`, and related Atlassian MCP tools.
- Never run `confluence`, `acli`, or shell wrappers around them.
- Read existing files under `./confluence/` when present.
  When a route needs a local pull, push, or sync, ask the user to run the matching **CLI** command below.

## Human CLI

Local pages live under `./confluence/` as markdown with YAML frontmatter (`id`, `title`, `version`, `url`, `syncedHash`, ...).

```sh
confluence <pageUrl|pageId>        same as confluence pull
confluence pull [pageUrl|pageId]   fetch one page tree, or all local pages when omitted
confluence push [pageId]           push one page, or all local pages when omitted
confluence sync <path.md>          pull or push one file from frontmatter state
confluence status                  show clean / modified / behind / links state
confluence verify                  fail if any relative .md links remain
```

Links in pulled markdown must use full Confluence wiki URLs or Jira `/browse/KEY` URLs, not relative `.md` paths.

## MCP mapping

| Need | MCP |
| --- | --- |
| One page by id | `getConfluencePage` |
| Child pages | `getConfluencePageDescendants` |
| CQL search | `searchConfluenceUsingCql` |
| Cloud/site id | `getAccessibleAtlassianResources` |
| Broad search | `searchAtlassian` |

If MCP is unavailable, say so and stop.
Do not substitute `acli` or the `confluence` CLI.
