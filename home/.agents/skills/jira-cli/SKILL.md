---
name: jira-cli
description: Runs the `jira` CLI around `jira info`. Use for keys, URLs, JQL, jira/ markdown, pull, push, sync, board, or writes.
---

# Jira CLI

Run all Jira work through the `jira` CLI.
`jira info` is the **info** hub: project, site, cloudId, me, custom field ids,
statuses, link types, issue types, sprints, and local `jira/` summary.

Ticket workflow gates and classification live in the `jira` skill.
This skill is how to drive the CLI once that path is clear.

## Step 1 - Load info

```sh
jira info
jira --json info
```

Use the returned values for every later command: `project`, `cloudId`,
`meAccountId`, `featureTeamField` / option id, `epicLinkField`, `sprintField`,
`storyPointsField`, `statuses`, `linkTypes`, `issueTypes`, active sprint, and
local ticket count.

When auth or config looks wrong, run `jira doctor --json`, then fix, then
reload info.
When board or field caches look stale, run `jira sync`, then reload info.

**Done when:** workspace values above are known for this session (or doctor named
the blocker).

## Step 2 - Act from info

Pick one command family from `jira -h` (same groups below). Prefer values from
info over guessing project keys, status names, link types, or custom field ids.

```sh
jira board                 # my tickets + unassigned from cache
jira show KEY              # live JSON, no local write
jira search --jql "..."    # JQL (scope with info.project / sprint)
jira pull KEY              # local markdown under jira/
jira create ... --yes      # writes: jira skill approval gate first
```

Read existing files under `./jira/` before editing them.
After a write, refresh with `jira pull KEY` unless the command already pulled.

**Done when:** the chosen command ran with flags grounded in info, or the
blocker was reported.

## Command map

Matches `jira -h`. Global `--json` wraps stdout as `{success, data, error}`.
Details in [references/agent-io.md](references/agent-io.md).

### Agent workspace

| Command | Role |
| --- | --- |
| `jira info` | **info** hub (plain text or `--json`) |
| `jira sync` | Refresh `~/.config/jira/board.json` and `~/.config/jira/info.json` |
| `jira board` | My tickets + unassigned. `--full` adds teammates |
| `jira doctor` | Verify acli, auth, config, board cache |
| `jira batch` | Read-only argv arrays on stdin / `--file` |

### Read

| Command | Role |
| --- | --- |
| `jira show <KEY\|URL>` | One issue as JSON (`--fields`, `--format text`) |
| `jira search --jql <query>` | JQL search (`--fields`, `--format text`, `--no-paginate`) |
| `jira projects` | Visible projects |
| `jira types` | Issue types for configured project |

### Local tickets

Tickets live under `./jira/<type>/` as markdown with YAML frontmatter.
Stories nest under their epic:
`jira/story/<parent title - PROJ-XXXXX>/<story title - PROJ-YYYYY>.md`.

| Command | Role |
| --- | --- |
| `jira <KEY\|URL>` | Fetch into `jira/` (Initiative/Epic: full tree) |
| `jira pull [KEY\|URL]` | Fetch one, or all local when omitted |
| `jira push [KEY\|URL]` | Push one, or all local when omitted |

### Write

Require the `jira` skill write approval gate, then pass `--yes` in
non-interactive sessions. Take type, status, and link-type names from info.

| Command | Role |
| --- | --- |
| `jira create --type <T> --summary <text>` | Create (see flags below) |
| `jira edit <KEY>` | `--summary`, `--description-file`, `--labels`, `--from-json` |
| `jira transition <KEY> --status <name>` | Status change |
| `jira comment <KEY>` | `--body-file` or `--body` |
| `jira link` | `--out` `--in` `--type`, or `--from-json` |

Create flags: `--parent`, `--description-file`, `--label`, `--field`,
`--from-draft`, `--from-json`, `--no-pull`.

### Other

| Command | Role |
| --- | --- |
| `jira acli <args...>` | Ad-hoc `acli jira` reads / other projects |
| `jira -h` | Full help |

`jira acli` blocks auth, deletes, and writes already exposed on `jira`.
Config: `~/.config/jira/config.json`.

If the `jira` CLI is unavailable, say so and stop for Jira work.
