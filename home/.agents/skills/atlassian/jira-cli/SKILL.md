---
name: jira-cli
description: "jira CLI for board context, `~/jira` pull-edit-push, and gated writes. Use for `jira info`/`jira board`, keys/JQL, or when `jira` needs the CLI."
user-invocable: false
---

# Jira CLI

Run Jira through the `jira` CLI.
**Never write to Jira without the `jira` skill Write Approval Gate.**
The CLI does not enforce the gate.
Create, edit, push, transition, comment, and link only after that gate returns Approve for the exact change.

Prefer `jira` over raw `acli` and over Atlassian MCP when the CLI covers the need.
On auth failure, stop and ask.

## Read vs cache

| Intent | Command |
| --- | --- |
| Read markdown and refresh `~/jira` when stale | `jira show KEY` |
| Force refresh under `~/jira` without printing | `jira pull KEY` or bare `jira KEY` |
| Publish local summary/description | `jira push KEY` (after gate Approve) |

`jira show KEY` prints markdown and writes or refreshes the `~/jira` copy when it is missing or older than one day.
Bare `jira KEY` only refreshes the cache and does not print the ticket body.

## Local-first (when `~/jira` exists)

When `~/jira` has pulled tickets, local markdown is the ticket surface:

1. `jira show KEY` to read. Use `jira pull KEY` only when you must edit the file on disk.
   **Done when:** the ticket markdown is in hand for this turn.
2. Edit summary/description in that file (`title` in frontmatter + body).
   **Done when:** the file matches the intended change.
3. After the `jira` skill gate Approve: `jira push KEY`
   **Done when:** push succeeds (push refreshes the file from Jira).

`jira push` syncs **summary** and **description** only.
Status, comments, links, labels, and custom fields use the CLI writes below, then `jira pull KEY`.

### One call per read

`jira show KEY` picks the source itself, so one call is always enough:

- Local copy newer than **1 day**: printed from `~/jira`.
- Local copy missing or older than 1 day: fetched live and written to `~/jira`.
- Live fetch fails: the stale local copy is printed as a fallback.

Do not follow a `show` with a second `show --remote`.
Add `--remote` only to force a live fetch when you know the remote changed this turn.
Add `--local` to accept a stale local copy without any fetch.
`--json` output carries `source` (`local` or `remote`) and `stale`.

Before editing a pulled file, run `jira pull KEY` so the file on disk matches Jira.

## Orientation (every Jira session)

1. `jira info` (or `jira info --json` for fields + `localTickets` + full `board` cache)
   **Done when:** cloudId, project, featureTeamOptionId, sprintId(s), field ids,
   local keys, and my/unassigned (plus teammates/misc in `--json` `board`) are in hand
   (run `jira sync` first if board is missing).
2. `jira board` (optional)
   **Done when:** you only want the human full-board text dump (`info --json` already includes `board`).

One-shot structured reads: `jira info --json`, or
`jira batch --json '[["info"],["show","KEY"]]'` (JSON array as an argument, a file path, `--file`, or stdin).
Batch `info` matches `jira info --json` (includes `board`).
Batch `show` returns `{ source, key, markdown }` (same markdown as `jira show`), not raw ADF.

### Optimize calls

- Prefer one `jira info` / `info --json` per session, then reuse it.
- Prefer `jira batch --json` over a chain of separate `show` / `search` processes.
- Prefer one `jira show KEY` per ticket. It already falls back to a live fetch, so do not retry with `--remote`.
- Prefer `jira show KEY` for a known key. Do not parse a large search payload to read one ticket.
- Prefer `jira search` for discovery only. Default output is a compact hit list (no description ADF).
  Then `jira show KEY` for bodies. Avoid `search --raw`.
- Prefer narrow JQL and `--limit`. Default search limit is 20.
- After create/push (which refresh local files), do not immediately re-show unless needed.

Verify with `jira doctor --json` when setup looks wrong.

Command history is appended to `~/jira/logs/YYYY-MM-DD.log` (args and errors only, not stdout).

### PR title lookup

The `pr` skill resolves title keys with bounded reads:

1. Use `jira info` only to select a candidate from My tickets or Unassigned.
2. Use `jira show KEY` once to validate the selected ticket and its status.
3. Do not use `jira pull`, bare `jira KEY`, `acli`, or Atlassian MCP for this lookup.

`jira show KEY` fetches live when no fresh local mirror exists. Do not retry it with `--remote`.

## Reads

| Need | Use |
| --- | --- |
| One issue | `jira show KEY` (fresh local copy, else live markdown) |
| Force a live read | `jira show KEY --remote` |
| Refresh the file on disk | `jira pull KEY` |
| One issue to disk | `jira pull KEY` (or bare `jira KEY`) |
| JQL discovery (compact list) | `jira search "..."` |
| One issue body | `jira show KEY` |
| My tickets / unassigned | `jira info` (plain) or `jira info --json` → `board.sections` |
| Full board | `jira info --json` → `board` (or `jira board` for human text) |
| cloudId / field ids / local keys | `jira info` / `jira info --json` |
| Available statuses | `jira transition KEY` (lists current + known) |

Use Atlassian MCP only when the CLI cannot cover the need (for example worklog, or edit custom fields if `jira edit --field` is rejected by acli).

## Create recipe

After the `jira` skill write gate Approve:

```sh
jira info   # featureTeamOptionId, sprintId, storyPointsField, project

# Prefer draft promote
jira create --from-draft ~/jira/story/...md

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

`jira search` prefers **JQL**. Bare words are rewritten to
`project = <config> AND text ~ "\"...\""` so agents do not hit parse errors.

```sh
# Open sprint for the configured Feature Team (name from jira info)
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors'

# Children of a parent
jira search 'parent = NOVACORE-12345'

# Recent team ticket to reuse a parent
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors ORDER BY updated DESC' --fields key,summary,parent

# Summary / text contains (quoted phrase + ~)
jira search 'project = NOVACORE AND summary ~ "\"white label\""'
jira search 'project = NOVACORE AND text ~ "\"design governance\""'

# Bare words (rewritten by CLI)
jira search "design governance"
```

For a known key, use `jira show KEY` to read, or `jira pull KEY` / `jira KEY` to cache.
`jira issue KEY` is accepted as an alias for `jira show KEY`.

## Commands

```sh
jira <KEY|URL> | jira pull [KEY] | jira push [KEY]
jira sync | jira board | jira info | jira doctor
jira batch '[["info"],["show","KEY"]]' [--file PATH] [--stop-on-error]
jira show KEY [--remote] [--local] | jira search "..." | jira projects | jira types
jira create --type T --summary "..." [--parent KEY] [--sprint ID] [--story-points N] [--field id=value] [--from-draft path]
jira edit KEY [--summary ...] [--description-file ...] [--labels ...] [--field id=value]
jira transition KEY [Status]
jira comment KEY "body"
jira link --out KEY --in KEY --type Relates
jira acli <args...>   # reads / other projects; gated writes blocked
```

Global: `--json` for `{success, data, error}` (including `jira info --json`).

Config: `~/.config/jira/config.json`. Caches: `~/.config/jira/board.json`, `info.json`.
Pulled tickets: `~/jira/<type>/<title> - <KEY>.md`.

## Writes

1. Complete the `jira` skill **Jira Write Approval Gate** (Approve only). Never skip this.
2. Apply the write:
   - summary/description with `~/jira` present: edit the local file, then `jira push KEY`
   - otherwise: `jira create|edit|transition|comment|link`
3. After CLI writes (not push), refresh with `jira pull KEY`.

One Approve covers one described change set.
