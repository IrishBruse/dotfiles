# Commands

Full `jira` CLI surface for this skill.

## Local tickets

```bash
jira <KEY|URL>          # cache one ticket under ~/jira (not a view)
jira pull [KEY|URL]     # refresh one, or every local ticket
jira push [KEY|URL]     # publish one, or every local ticket
```

## Workspace

```bash
jira sync               # refresh board.json and info.json
jira board              # print cached board (plain text, preferred)
jira info               # context + my/unassigned (plain text, preferred)
jira doctor             # acli, auth, config, caches
jira batch [JSON]       # read-only commands in one process (prefer plain commands)
```

Prefer plain output for agent reads. Use `--json` when chaining with other commands.

Optional JSON (chaining / scripting):

```bash
jira board --json
jira info --json
jira info --json --board
jira doctor --json
jira batch --json '[["info"],["show","KEY"]]'
```

Batch example without global `--json` prints ok/FAIL lines only.
Prefer plain `jira show` / `jira search` for agent context.

Batch `show` → `{ source, key, markdown }`.
Batch `search` → compact search envelope unless item includes `--raw`.

## Reads

```bash
jira show KEY|URL [--remote] [--local] [--fields LIST]
jira search <jql|words> [--limit N] [--paginate] [--fields LIST] [--raw]
jira projects
jira types
```

Alias: `jira issue KEY` → `jira show KEY`.

### Show flags

- default: fresh local copy, else live fetch + write `~/jira`
- `--remote`: force live fetch and refresh cache
- `--local`: use local copy even when stale
- `--fields LIST`: live fetch with selected fields

### Search flags

- default: compact hits, limit 20, fields without description
- `--limit N`: max issues
- `--paginate`: fetch all matches
- `--fields LIST`: override list fields
- `--raw`: full acli JSON

## Writes (after `jira` skill gate Approve)

```bash
jira create --type T --summary "..." [--parent KEY] [--sprint ID]
            [--story-points N] [--field id=value] [--from-draft path]
            [--from-json path] [--no-board-defaults]
jira edit KEY [--summary ...] [--description-file ...] [--labels ...]
              [--field id=value] [--from-json path]
jira transition KEY [Status]
jira comment KEY "body" | --body ... | --body-file PATH
jira link --out KEY --in KEY --type NAME
```

## Other

```bash
jira -h | --help
--json                  # {success, data, error} for chaining (prefer plain for reads)
```

## Paths

- Config: `~/.config/jira/config.json`
- Board cache: `~/jira/board.json`
- Info cache: `~/.config/jira/info.json`
- Tickets: `~/jira/<type>/<title> - <KEY>.md`
- Logs: `~/jira/logs/YYYY-MM-DD.log` (command args and errors only)
