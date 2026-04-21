# jira-board-sync

Syncs Jira issues via the [Atlassian CLI](https://developer.atlassian.com/cloud/acli/) (`acli jira workitem search`) into a local board tree and updates the **`jira-tickets`** agent skill.

## Requirements

- **Node.js** 24+
- **`acli`** on your `PATH`, with Jira auth: `acli jira auth login`

## Usage

Edit **`CONFIG`** at the top of `sync-board.ts`, then run:

```bash
node tools/jira-board-sync/bin/jira-board-sync.js
```

There are no subcommands, flags, or environment variables—settings live only in `CONFIG`.

## What it writes

| Output | Purpose |
|--------|---------|
| `<outputDir>/me/*.md`, `unassigned/`, `team/` | One markdown file per issue (YAML frontmatter + description) |
| `jiraTicketsSkillPath` | Default: `<repo>/.agents/skills/jira-tickets/SKILL.md` — plaintext board snapshot for agents |

If `outputDir` is empty, the board root is **`~/jira-board`**.

## CONFIG fields

| Field | Purpose |
|-------|---------|
| `site` | Atlassian host, e.g. `your-org.atlassian.net` |
| `meAccountId` | Your Atlassian account ID (`assignee.accountId` from an issue) |
| `boardId` | Optional. Scrum/Kanban board id; when set, only **active sprints on that board** are used (`sprint in (…)`) |
| `boardJql` | JQL; put `ORDER BY` at the end. With `boardId`, avoid `sprint in openSprints()` (it is stripped if present) |
| `outputDir` | Board root; empty → `~/jira-board` |
| `clean` | If `true`, delete existing `*.md` in the three folders before writing |
| `jiraTicketsSkillPath` | Path to `SKILL.md`; empty → default under `.agents/skills/jira-tickets/` |
| `acli` | Path to the `acli` binary (default `acli`) |

## Validate (TypeScript)

From the dotfiles repo root:

```bash
./node_modules/.bin/tsc --noEmit -p tools/jira-board-sync
```
