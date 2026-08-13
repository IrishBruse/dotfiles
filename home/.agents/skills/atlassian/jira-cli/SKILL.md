---
name: jira-cli
description: "jira CLI for board context, `~/jira` pull-edit-push, and gated writes. Use for `jira info`/`jira board`, keys/JQL, or when `jira` needs the CLI."
user-invocable: false
---

# jira-cli

Agent-facing Jira CLI. Prefer compact reads that stay in hundreds of tokens, not raw acli or ADF blobs.

**Never write to Jira without the `jira` skill Write Approval Gate.**
The CLI does not enforce the gate.
On auth failure, stop and ask.

Prefer `jira` over Atlassian MCP when the CLI covers the need.

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
| Session context | `jira info` once | Re-running `info` / `doctor` every turn |
| Structured fields | `jira info --json` (slim) | `info --json --board` unless board is needed |
| Full board | `jira board` / `jira board --json` | Expecting board inside slim `info --json` |
| Find tickets | `jira search "..."` | `search --raw`, `jira workitem search` |
| Read one ticket | `jira show KEY` | `jira workitem view`, `show` then `show --remote` |
| Cache only | `jira pull KEY` / `jira KEY` | Using bare `jira KEY` as a view |
| Publish summary/body | edit `~/jira/...`, then `jira push KEY` | `edit --description-file` when a local file exists |
| Status / comment / link | `jira transition` / `comment` / `link` after gate | Skipping the write gate / `jira workitem *` |

### Search output (default)

Compact hits only. Default `--limit 20`. No description field.

```text
NOVACORE-123	Bug	To Do	Ada	Module load error on bootstrap
1 issue(s). Use jira show KEY for full ticket markdown.
```

`--json` returns `{ jql, count, limit, issues[{key,summary,type,status,assignee}], hint }`.
Use `jira show KEY` for AC, description, and local cache refresh.
Use `search --raw` only when you truly need full acli JSON.

### Show output

One markdown ticket with frontmatter. Refreshes `~/jira` when missing or older than 1 day.
One call is enough. Do not follow with `--remote` unless you know the remote changed this turn.

### Info output

- `jira info`: plain fields + my/unassigned summary (~small)
- `jira info --json`: slim fields + hint (no board sections)
- `jira info --json --board` or `jira board --json`: full board when needed

Do not use `jira workitem ...` or `jira acli ...`. The CLI redirects those mistakes to `show`/`search`/`create`/`edit`.

## Token rules

- One `jira info` per session. Reuse it. Do not spam `doctor`.
- Prefer `jira batch --json '[["info"],["show","KEY"]]'` over a chain of processes.
- Prefer `jira show KEY` for a known key. Prefer `jira search` only to discover keys.
- Prefer narrow JQL and `--limit`. Default search limit is 20.
- After create/push, do not immediately re-show unless fields still need a live check.
- Command history: `~/jira/logs/YYYY-MM-DD.log` (args and errors only).

## Common workflows

### Orient

```bash
jira info                 # plain: me / unassigned / localTickets
jira info --json          # slim fields (no board dump)
jira board --json         # full board only when needed
jira doctor --json        # only when setup looks wrong
```

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
3. After `jira` skill gate Approve: `jira push KEY`

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
jira info | jira info --json | jira info --json --board | jira board | jira sync | jira doctor
jira search "..." [--limit N] [--fields LIST] [--paginate] [--raw]
jira show KEY [--remote|--local] | jira pull [KEY] | jira push [KEY]
jira batch --json '[["info"],["show","KEY"],["search","JQL"]]'
jira create|edit|transition|comment|link   # after write gate
```

Alias: `jira issue KEY` → `jira show KEY`.
Global: `--json` → `{success, data, error}`.

Paths: config `~/.config/jira/config.json`, board `~/jira/board.json`,
info cache `~/.config/jira/info.json`, tickets `~/jira/<type>/...`,
logs `~/jira/logs/YYYY-MM-DD.log`.

## When to load another skill

- Ticket classification, drafts, or write approval UX: `jira` skill
- Confluence pages: `confluence-cli` skill
- PR title key selection: `pr` skill (`jira info` → one `jira show KEY`)

## Bundled reference

- [references/search.md](references/search.md) - JQL patterns and search flags
- [references/writes.md](references/writes.md) - create/edit/push/transition recipes and gate rules
- [references/commands.md](references/commands.md) - full command and flag list
