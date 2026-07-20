---
name: confluence-cli
description: 'Runs the `confluence` CLI (plus Confluence MCP for what the CLI cannot do) for local `confluence/` markdown and live pages. Use when working on
  Confluence pull/push/sync, page URLs, or CQL search.'
user-invocable: false
---

# Confluence CLI

Use the `confluence` CLI to sync local markdown against live Confluence pages.
Use **Confluence MCP** when the CLI is not enough for reads or writes.
For Jira, use the `jira-cli` skill.

Read existing files under `./confluence/` before editing them.

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

Requires: `acli confluence auth login`

## When to use CLI vs MCP

| Need | Tool |
| --- | --- |
| Local markdown pull/push/sync | `confluence` CLI |
| One page by id (live, no local file) | Confluence MCP `getConfluencePage` |
| Child pages | `getConfluencePageDescendants` |
| CQL search | `searchConfluenceUsingCql` |
| Cloud/site id | `getAccessibleAtlassianResources` |
| Broad search | `searchAtlassian` |
| Create, edit, publish (live) | matching Atlassian MCP write tools |

Prefer the CLI when the repo already has `./confluence/` markdown or you need pull/push/sync workflow.
Prefer MCP for ad-hoc live reads/writes without local files.

If both Confluence CLI and MCP are unavailable, say so and stop for Confluence work.
