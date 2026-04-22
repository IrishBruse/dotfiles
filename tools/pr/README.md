# pr-cli

Runs [Cursor Agent](https://cursor.com) (`agent`) with one **`prompt.md`** (plus create **`work/prompt.md`** when `PR_TITLE_JIRA_KEY` is set) per command under **`src/commands/{review,update,create}/`**. Needs **`gh`** and **`agent`** on `PATH`, and Node **24+**.

## Install

```bash
cd tools/pr-cli
npm install
npm link
```

Run without linking: `node /path/to/tools/pr-cli/bin/pr.js …`

## Flag

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Print usage to stderr and exit with code 2. |

Any other option starting with `-` is rejected.

## Environment

| Variable | Description |
|----------|-------------|
| `PR_TITLE_JIRA_KEY` | **Work-only toggle:** optional project key (e.g. `NOVACORE`). When **set** in your environment (e.g. work repo / `direnv`), prompts require a PR title matching `KEY-<digits>` and the agent uses Jira MCP where applicable; the CLI may validate the resolved title before `gh` commands. When **unset** (default for personal use), no Jira ID is required on the title and create/review flows do not assume Jira. Not a CLI flag — global env only. |
| `PR_AGENT` | Binary for [Cursor print mode](https://www.cursor.com/docs/cli/headless) (default: `agent`, with `cursor-agent` tried if the first is missing). |
| `PR_AGENT_TIMEOUT_MS` | Max time in milliseconds for one `agent -p` run (default: 1,200,000 = 20 minutes). |
| `CURSOR_API_KEY` | Required for headless `agent` in some setups; see Cursor CLI auth docs. |
| `PR_REVIEW_NO_CONFIRM` | Set to `1` to skip the markdown preview and TTY confirm for `pr review` (e.g. in scripts or CI), and post the comment if parsing succeeds. |

HEAD state for default `pr` add/update is stored at **`~/.local/state/pr-cli/last-head.json`** (updated after each successful posted review for that PR).

## Prompt files (`src/commands/…/prompt.md`)

| Path | Command | Role |
|------|---------|------|
| `review/prompt.md` | `pr review`, default `pr` (add) | First-pass review: shared + first-pass body; `{{prLine}}`, `{{hintBlock}}`, `{{workJiraTitleSection}}` when `PR_TITLE_JIRA_KEY` set; fenced JSON (`title`, `body`, optional `pr`). |
| `update/prompt.md` | `pr update`, default `pr` (update) | Follow-up; `{{hintBlock}}` / `{{workJiraTitleSection}}` when env set. |
| `create/prompt.md` | `pr create` | New PR from branch; JSON `title` / `body`. |
| `create/work/prompt.md` | `pr create` | **Only if** `PR_TITLE_JIRA_KEY` set — Jira title + jira-board skill; appended to base. |

## Commands

### `pr` (default)

**What it does:** Compares `headRefOid` to `~/.local/state/pr-cli/last-head.json` and loads **`src/commands/review/prompt.md`** (add / first run / same-HEAD compact) or **`src/commands/update/prompt.md`** (new commits). Runs `agent` with `--print`, parses a final **`json`** fence (`title`, `body`, and **`pr`** if you did not pass a PR on the argv), renders markdown in the terminal, then **Enter** posts **`gh pr review --comment`** or **Esc** cancels.

**Forms:** `pr`, `pr <pr>`

---

### `pr review`

**What it does:** Loads **`src/commands/review/prompt.md`**, runs **`agent -p --output-format stream-json --stream-partial-output`** (see env above). Progress (model, streaming assistant text, read/write tools) is printed to **stderr**; the final **`result`** string is used to find the last **`json`** fence (`title`, `body`). Then a markdown preview on stdout, **Enter** → **`gh pr review <pr> --comment -F`**, **Esc** cancels. With **`PR_REVIEW_NO_CONFIRM=1`**, skips preview and posts when parsing succeeds.

**Form:** `pr review <pr>` (URL or number; required)

---

### `pr update`

**What it does:** Loads **`src/commands/update/prompt.md`** — always follow-up; same JSON + TTY + `gh pr review` flow.

**Form:** `pr update [<pr>]`

---

### `pr create`

**What it does:** Loads **`src/commands/create/prompt.md`** (and **`work/prompt.md`** when `PR_TITLE_JIRA_KEY` is set). Same **`--print`** / JSON / markdown terminal preview pattern; **Enter** → `gh pr create` or **Esc** cancel.

**Form:** `pr create`
