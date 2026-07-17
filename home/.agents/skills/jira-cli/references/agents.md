# Jira CLI for agents

Agent-oriented reference for the `jira` CLI. For ticket workflow gates, read the `jira` skill.

## Start here

```sh
jira info
jira doctor --json
jira sync
```

- `jira info` -- flat raw MCP/CLI context (cloudId, project, meAccountId, field ids, sprints)
- `jira board` -- my tickets and unassigned from `~/.config/jira/board.json` (use `--full` for teammates)
- `jira doctor --json` -- verify acli, auth, CONFIG, and cache before retrying failures
- `jira sync` -- refresh `~/.config/jira/board.json` and `~/.config/jira/info.json`

## Core loop

```sh
jira info
jira sync
jira show KEY
jira pull KEY
jira create ... --yes    # requires jira skill write approval gate
jira pull KEY            # refresh local markdown after writes
```

## JSON envelope

Pass global `--json` before the subcommand:

```sh
jira --json info
jira --json show NOVACORE-123
jira --json doctor
```

Stdout shape:

```json
{"success": true, "data": {}, "error": null}
{"success": false, "data": null, "error": "message", "code": "AUTH"}
```

| Command | Human default | With `--json` |
| --- | --- | --- |
| `show`, `search`, `projects`, `types` | Raw acli JSON | Envelope around payload |
| `info` | Plain text | `JiraInfo` object |
| `board` | Plain text board summary | `BoardContent` object |
| `sync` | Prose summary | Sync stats object |
| `create`, `edit`, `transition`, `comment`, `link` | One-line confirmation | `{key, action, ...}` |
| `pull`, `push` | Colored lines | `{keys, count}` |
| Errors | `error: msg` on stderr | Envelope on stdout, exit 1 |

Error codes (optional `code` field): `AUTH` for auth failures surfaced by commands.

## Batch reads

Run multiple read-only commands in one invocation:

```sh
echo '[["info"],["projects"]]' | jira batch --json
jira batch --file commands.json --json
```

Allowed subcommands: `info`, `board`, `show`, `search`, `projects`, `types`.

Input: JSON array of argv arrays (no leading `jira`).

Output envelope `data` is an array of `{index, success, data, error}`.

Use `--stop-on-error` to halt after the first failed item.

## Doctor checks

| Check | Pass | Fail fix |
| --- | --- | --- |
| `acli` | Binary on PATH | Install acli |
| `auth` | `project list` succeeds | `jira acli auth login` |
| `config` | site, project, boardId, meAccountId set | Edit `tools/jira/lib/CONFIG.ts` |
| `board-cache` | Cache present and fresh | `jira sync` |
| `local-tickets` | Count under `jira/` | Informational |
| `acli-policy` | Blocks raw `workitem create` | CLI regression |

## Parallels to agent-browser

| agent-browser | jira CLI |
| --- | --- |
| `snapshot -i` | `jira show KEY` (raw JSON) or future `--compact` |
| `doctor --json` | `jira doctor --json` |
| `batch --json` | `jira batch --json` |
| `--session` + `--restore` | Local `jira/` markdown + `~/.config/jira/board.json` cache |
| `skills get core` | `~/.agents/skills/jira/SKILL.md` |

## Safety

- Never run bare `acli`. Use `jira` or gated `jira acli`.
- Jira writes require the `jira` skill **Jira Write Approval Gate** before `create`, `edit`, `transition`, `comment`, or `link`.
- Use `--yes` on writes in non-interactive agent sessions.
