---
name: jira-cli
description: "jira CLI for board context, `jira/` pull-edit-push, and gated writes. Use for `jira info`/`jira board`, keys/JQL, or when `jira` needs the CLI."
user-invocable: false
---

# Jira CLI

Run Jira through the `jira` CLI.
Ticket routing and the write approval **gate** live in the `jira` skill.
Prefer `jira` over raw `acli` and over Atlassian MCP when the CLI covers the need.
On auth failure, stop and ask.

## Local-first (when `jira/` exists)

When the workspace has a `jira/` folder, local markdown is the ticket surface:

1. `jira show KEY` (uses the local file when present) or `jira pull KEY` when missing
   **Done when:** the ticket markdown is in hand for this turn.
2. Edit summary/description in that file (`title` in frontmatter + body).
   **Done when:** the file matches the intended change.
3. After the `jira` skill gate Approve: `jira push KEY`
   **Done when:** push succeeds (push refreshes the file from Jira).

`jira show` prints the local copy when it exists.
Use `jira show KEY --remote` (or `--fields`) for a live fetch.
`jira push` syncs **summary** and **description** only.
Status, comments, links, labels, and custom fields use the CLI writes below, then `jira pull KEY`.

Without `jira/`, `jira show` fetches live, or `jira pull KEY` first to start this loop.

## Orientation (every Jira session)

1. `jira info`
   **Done when:** cloudId, project, featureTeamOptionId, sprintId(s), field ids,
   and my/unassigned tickets are in hand (run `jira sync` first if board is missing).
2. `jira board` (optional)
   **Done when:** full board including teammates/misc is needed.

Verify with `jira doctor --json` when setup looks wrong.

## Reads

| Need | Use |
| --- | --- |
| One issue | `jira show KEY` (local `jira/` copy when present, else live) |
| Refresh one issue | `jira show KEY --remote` or `jira pull KEY` |
| One issue to disk | `jira pull KEY` |
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

# Typical Task/Story (Feature Team applied automatically; add sprint explicitly when needed)
jira create --type Task --summary "..." --parent KEY --story-points 1 --sprint 27857

# Explicit fields (override defaults)
jira create --type Story --summary "..." --parent KEY \
  --field customfield_10354=16409 \
  --field customfield_10021=27857 \
  --field customfield_10023=1
```

Defaults:

- Feature Team from `jira info` is applied on every create when the option id is known.
- Sprint is not inferred from the board (avoids polluting sprint metrics).
  Use `--sprint <id>` or `--field customfield_10021=<id>` when the ticket belongs in a sprint.
- `--story-points <n>` sets story points when provided.
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

## Custom fields and non-markdown edits

Prefer local-first for summary/description.
Use `jira edit` only for fields `jira push` cannot sync:

```sh
jira edit KEY --field customfield_10023=2
jira edit KEY --labels a,b --field customfield_10354=16409
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
jira show KEY [--remote] | jira search "..." | jira projects | jira types
jira create --type T --summary "..." [--parent KEY] [--sprint ID] [--story-points N] [--field id=value] [--from-draft path]
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
2. Apply the write:
   - summary/description with `jira/` present: edit the local file, then `jira push KEY`
   - otherwise: `jira create|edit|transition|comment|link`
3. After CLI writes (not push), refresh with `jira pull KEY`.

One Approve covers one described change set.
