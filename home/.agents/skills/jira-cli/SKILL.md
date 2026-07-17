---
name: jira-cli
description: "Runs the `jira` CLI (`jira info`, `jira board`, show, search, pull/push, writes). Use for Jira keys, URLs, JQL, or local `jira/` markdown."
---

# Jira CLI

Run Jira work through the `jira` CLI.
`jira info` is the **info** hub: project, site, cloudId, me, Feature Team, sprint ids,
story points field, and my/unassigned board tickets.

Ticket routing and the write approval **gate** live in the `jira` skill.
For Confluence, use the `confluence-cli` skill.

Prefer `jira` over raw `acli` and over Atlassian MCP when the CLI covers the need.
Take `cloudId` from `jira info`, not `getAccessibleAtlassianResources`.
On auth failure, stop and ask. Do not work around it.

## Orientation (every Jira session)

1. `jira info`
   **Done when:** cloudId, project, featureTeamOptionId, sprintId(s), field ids,
   and my/unassigned tickets are in hand (run `jira sync` first if board is missing).
2. `jira board` (optional)
   **Done when:** full board including teammates/misc is needed.

Verify with `jira doctor --json` when setup looks wrong.

## Prefer CLI for reads

| Need | Use |
| --- | --- |
| One issue | `jira show KEY` (markdown stdout) or `jira pull KEY` (local markdown) |
| JQL | `jira search "..."` |
| My tickets / unassigned | `jira info` (included) |
| Full board | `jira board` / `jira sync` |
| cloudId / field ids | `jira info` |
| Available statuses | `jira transition KEY` (lists current + known) |

Use Atlassian MCP only when the CLI cannot cover the need (for example worklog, or edit custom fields if `jira edit --field` is rejected by acli).

## Create recipe

After the `jira` skill write gate Approve:

```sh
jira info   # featureTeamOptionId, sprintId, storyPointsField, project

# Typical Task/Story in the current sprint (Feature Team + sprint applied automatically)
jira create --type Task --summary "..." --parent KEY --story-points 1

# Explicit fields (override defaults)
jira create --type Story --summary "..." --parent KEY \
  --field customfield_10354=16409 \
  --field customfield_10021=27857 \
  --field customfield_10023=1
```

Defaults:

- Feature Team from `jira info` is applied on every create when the option id is known.
- Current sprint from info is applied by default. Opt out with `--no-board-defaults`.
- `--sprint <id>` / `--story-points <n>` set those fields.
- `--field id=value` always wins over defaults.
- NOVACORE Epic creates get Capitalizable=Yes when unset.
- `--from-json` skips defaults (full payload). `--from-draft` still applies defaults.

## Transition and comment

```sh
# List current status + known board statuses (no write)
jira transition KEY

# Transition (positional status; --status still works)
jira transition KEY Cancelled

# Comment (positional body; --body / --body-file still work)
jira comment KEY "Cancellation reason..."
```

`jira show KEY` frontmatter uses the real status name (`status: Cancelled`) plus `status_bucket`.

## Edit custom fields

```sh
jira edit KEY --field customfield_10023=2
jira edit KEY --summary "New title" --field customfield_10354=16409
```

If acli rejects custom fields on edit, use Atlassian MCP `editJiraIssue` with the same field ids from `jira info`, then `jira pull KEY`.

## Common JQL

```sh
# Open sprint for the configured Feature Team (name from jira info)
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors'

# Children of a parent
jira search 'parent = NOVACORE-12345'

# Recent team ticket to reuse a parent
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors ORDER BY updated DESC' --fields key,summary,parent
```

## Commands

```sh
jira <KEY|URL> | jira pull [KEY] | jira push [KEY]
jira sync | jira board | jira info | jira doctor | jira batch
jira show KEY | jira search "..." | jira projects | jira types
jira create --type T --summary "..." [--parent KEY] [--no-board-defaults] [--sprint ID] [--story-points N] [--field id=value] [--from-draft path]
jira edit KEY [--summary ...] [--description-file ...] [--labels ...] [--field id=value]
jira transition KEY [Status]
jira comment KEY "body"
jira link --out KEY --in KEY --type Relates
jira acli <args...>   # reads / other projects; gated writes blocked
```

Global: `--json` for `{success, data, error}` (not used by `jira info`).

Config: `~/.config/jira/config.json`. Caches: `~/.config/jira/board.json`, `info.json`.
Pulled tickets: `jira/<type>/<title> - <KEY>.md`.

## Writes

1. Complete the `jira` skill **Jira Write Approval Gate** (Approve only).
2. Run `jira create|edit|transition|comment|link` (writes confirm automatically).
3. Refresh with `jira pull <KEY>` when local markdown should match.

One Approve covers one described change set.
