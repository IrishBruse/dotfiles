---
name: jira-cli
description: >-
  jira CLI for board context, `~/jira` pull-edit-push, and CLI reads/writes
  (`jira info`, `jira board`, search, show, pull, push). Prefer plain output
  for reads. Use `--json` when chaining. Do not load together with the `jira`
  skill — read exactly one of `jira` or `jira-cli`.
user-invocable: false
---

# jira-cli

Agent-facing Jira CLI. Prefer compact reads that stay in hundreds of tokens, not raw acli or ADF blobs.

## Read exactly one Jira skill

Read **either** this skill **or** the `jira` skill. Never both in the same turn.

| Need | Read |
| --- | --- |
| CLI commands, output modes, JQL, `~/jira` pull/push | this skill only |
| `/jira` routing, classification, drafts, write approval UX | `jira` only |

If `jira` is already loaded, do not read this skill. If this skill is already loaded, do not read `jira`.

**Prefer plain output for agent reads.** Default text is smaller than the `{success, data, error}` envelope.
Use `--json` when chaining with other commands (pipes, `jq`, scripts) that need structured fields.

**Never write to Jira without user Approve for the exact change.**
The CLI does not enforce that gate. Do not also read the `jira` skill to get the gate — if you need `/jira` routing or the full write-approval UX, read `jira` **instead of** this skill.
On auth failure, stop and ask.

Prefer the `jira` CLI over Atlassian MCP when the CLI covers the need.

## The core loop

```bash
jira info                          # 1. Session context (once)
jira search "module-load error"    # 2. Discover (compact hits)
jira show KEY                      # 3. Read one ticket body
# edit ~/jira/... then after gate: jira push KEY
```

Search is for discovery. `show` is for bodies.
Do not parse search JSON to read one ticket.

## Progressive disclosure

| Intent | Preferred | Avoid |
| --- | --- | --- |
| Session context | `jira info` once (plain) | Re-running `info` / `doctor` every turn |
| Structured / chaining | `jira info --json` when piping or scripting | `info --json --board` unless board JSON is needed |
| Full board | `jira board` (plain TSV lines) | `board --json` unless chaining needs raw cache |
| Find tickets | `jira search "..."` (plain) | `search --raw`, `jira workitem search` |
| Read one ticket | `jira show KEY` | `jira workitem view`, `show` then `show --remote`, `jira view` |
| Cache only | `jira pull KEY` / `jira KEY` | Using bare `jira KEY` as a view |
| Publish summary/body | edit `~/jira/...`, then `jira push KEY` | `edit --description-file` when a local file exists |
| Status / comment / link | `jira transition` / `comment` / `link` after gate | Skipping the write gate / `jira workitem *` |

### Search output (default)

Compact hits only. Default `--limit 20`. No description field.

```text
NOVACORE-123	Bug	To Do	Ada	Module load error on bootstrap
1 issue(s). Use jira show KEY for full ticket markdown.
```

`--json` wraps the same compact hits in `{success, data, error}`. Prefer plain for agent reads.
Use `--json` when chaining into other commands.
Use `jira show KEY` for AC, description, and local cache refresh.
Use `search --raw` only when you truly need full acli JSON.

### Show output

One markdown ticket with frontmatter. Refreshes `~/jira` when missing or older than 1 day.
One call is enough. Do not follow with `--remote` unless you know the remote changed this turn.

### Info output

- `jira info`: plain fields + my/unassigned TSV lines (preferred for agent reads)
- `jira info --json`: structured fields for chaining or scripting
- `jira board`: full cached board as plain TSV (preferred for agent reads)
- `jira board --json` / `jira info --json --board`: raw board cache JSON for chaining when required

Do not use `jira workitem ...` or `jira acli ...`. The CLI redirects those mistakes to `show`/`search`/`create`/`edit`.
**Never run `jira view`.** It opens VS Code for the user. Use `jira show KEY` to read a ticket.

## Token rules

- Prefer plain output for agent context. Use `--json` when chaining with other commands.
- One `jira info` per session. Reuse it. Do not spam `doctor`.
- Prefer separate plain commands (`jira info`, `jira show KEY`, `jira search "..."`) for reads.
  Use `jira batch --json` when one process must return structured results for chaining.
  Batch runs independent reads concurrently (cap 4). Identical show/search items share one call.
- Prefer `jira show KEY` for a known key. Prefer `jira search` only to discover keys.
- Prefer narrow JQL and `--limit`. Default search limit is 20.
- After create/push, do not immediately re-show unless fields still need a live check.
- Command history: `~/jira/logs/YYYY-MM-DD.log` (args and errors only).

## Common workflows

### Orient

```bash
jira info                 # plain: me / unassigned (preferred)
jira board                # full board plain text when needed
jira doctor               # only when setup looks wrong
```

Use `jira info --json` or `jira board --json` only when plain output cannot answer the question.

### Discover then read

```bash
jira search "design governance"
jira search 'parent = NOVACORE-12345' --limit 10
jira show NOVACORE-12345
```

Bare words become `project = <config> AND text ~ "\"...\""`.

### Local-first edit

1. `jira show KEY` (ensures `~/jira` copy)
2. Edit `title` + body in that file
3. After user Approve for the exact change: `jira push KEY`

`jira push` syncs summary and description only.
Other fields use `jira edit|transition|comment|link`, then `jira pull KEY`.

### Writes (after gate Approve)

```bash
jira create --from-draft ~/jira/story/...md
jira create --type Task --summary "..." --parent KEY --story-points 1 --sprint ID
jira transition KEY Cancelled
jira comment KEY "reason..."
jira link --out KEY --in KEY --type Relates
```

See [references/writes.md](references/writes.md) for create defaults, edit fields, and gate rules.

## Command map

```bash
jira info | jira board | jira sync | jira doctor
jira search "..." [--limit N] [--fields LIST] [--paginate] [--raw]
jira show KEY [--remote|--local] | jira pull [KEY] | jira push [KEY]
jira batch '[["info"],["show","KEY"],["search","JQL"]]'   # prefer plain commands instead
jira create|edit|transition|comment|link   # after write gate
```

Alias: `jira issue KEY` → `jira show KEY`.
`--json`: `{success, data, error}` for chaining. Prefer plain for agent reads.

Paths: config `~/.config/jira/config.json`, board `~/jira/board.json`,
info cache `~/.config/jira/info.json`, tickets `~/jira/<type>/...`,
logs `~/jira/logs/YYYY-MM-DD.log`.

## Other skills (instead of this one, never in addition)

- `/jira` routing, classification, drafts, or write-approval UX: `jira` only
- Confluence pages: `confluence-cli` only
- PR title key selection: `pr` skill (`jira info` → one `jira show KEY`)

## Bundled reference

- [references/search.md](references/search.md) - JQL patterns and search flags
- [references/writes.md](references/writes.md) - create/edit/push/transition recipes and gate rules
- [references/commands.md](references/commands.md) - full command and flag list
