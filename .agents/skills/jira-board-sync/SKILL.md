---
name: jira-board-sync
description: >-
  Fetches Jira issues via the Atlassian MCP (JQL search), writes markdown under
  ~/jira-board/me/, ~/jira-board/team/, and ~/jira-board/unassigned/, and deletes stale keys
  per folder. Use when syncing the board mirror, refreshing jira-board, or when the user
  mentions outdated tickets or team board sync.
---

# Jira board sync (`me/` + `team/` + `unassigned/`)

## Goal

Mirror **exactly** what each JQL returns into its folder (upsert `KEY.md`, delete missing keys):

| Folder | Typical JQL |
|--------|-------------|
| **`~/jira-board/me/`** | assignee = current user |
| **`~/jira-board/team/`** | board/sprint scope, assignee set, not you |
| **`~/jira-board/unassigned/`** | same scope, `assignee is EMPTY` |

Same issue must appear in **only one** folder (pick the JQL that matches it).

The hook `jira-tickets` maps `me/` → **My tickets**, `team/` → **Teammates**, `unassigned/` → **Unassigned** (by path, not by parsing `assigned:`).

## Prerequisites

- Atlassian MCP with JQL search (`searchJiraIssuesUsingJql` or equivalent).
- **`cloudId`**: `JIRA_CLOUD_ID` or MCP site resolution.
- **JQL files** under `~/jira-board/`:
  - **`.board-jql`** → `me/`
  - **`.team-jql`** → `team/`
  - **`.unassigned-jql`** → `unassigned/`

Ask the user if a file is missing.

## Issue file format

Match `.agents/hooks/scripts/jira-tickets.ts`: **`title:`**, **`assigned:`** (or **`asigneed:`**).

## Steps (three passes for a full sync)

1. **me/** — read `.board-jql`, fetch, write/delete under `me/` only.
2. **team/** — read `.team-jql`, fetch, write/delete under `team/` only.
3. **unassigned/** — read `.unassigned-jql`, fetch, write/delete under `unassigned/` only.

Shared: `mkdir -p` each folder before writes; keep config files; on MCP failure, do not delete until fetch succeeds.

## Optional: CLI mirror

`tools/mcp-cli/jira-ls.ts` with `--jql` and `--json` can feed the same layout.
