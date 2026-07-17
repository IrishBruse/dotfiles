# Agent I/O

Disclosed reference for `--json`, `batch`, and `doctor`. Load when parsing
structured output, batching reads, or debugging auth/config.

For ticket workflow gates, use the `jira` skill.
Always ground flags in `jira info` first.

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

Optional `code`: `AUTH` for auth failures.

## Batch reads

```sh
echo '[["info"],["projects"]]' | jira batch --json
jira batch --file commands.json --json
```

Allowed: `info`, `board`, `show`, `search`, `projects`, `types`.

Input: JSON array of argv arrays (no leading `jira`).
Output `data` is an array of `{index, success, data, error}`.
`--stop-on-error` halts after the first failed item.

## Doctor checks

| Check | Pass | Fail fix |
| --- | --- | --- |
| `acli` | Binary on PATH | Install acli |
| `auth` | `project list` succeeds | `jira acli auth login` |
| `config` | site, project, boardId, meAccountId set | Edit `~/.config/jira/config.json` |
| `board-cache` | Cache present and fresh | `jira sync` |
| `local-tickets` | Count under `jira/` | Informational |
| `acli-policy` | Blocks raw `workitem create` | CLI regression |

After a doctor fix, reload with `jira info`.
