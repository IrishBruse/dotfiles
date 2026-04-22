# pr-cli

Runs [Cursor Agent](https://cursor.com) (`agent`) with one markdown template per command under **`prompts/`**. Needs **`gh`** and **`agent`** on `PATH`, and Node **24+**.

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

HEAD state for default `pr` add/update is stored at **`~/.local/state/pr-cli/last-head.json`** (updated after each successful posted review for that PR).

## Prompt templates (`prompts/`)

| File | Command | Role |
|------|---------|------|
| `review.md` | `pr review`, default `pr` (add) | First-pass; `{{prLine}}`, `{{hintBlock}}`, `{{workJiraTitleSection}}` when `PR_TITLE_JIRA_KEY` set; fenced JSON (`title`, `body`, optional `pr`). |
| `update.md` | `pr update`, default `pr` (update) | Follow-up; same placeholders and JSON contract. |
| `create.md` | `pr create` | Core prompt: new PR from branch; JSON `title` / `body`. |
| `work/create-appendix.md` | `pr create` | **Only if** `PR_TITLE_JIRA_KEY` set — Jira title + jira-board skill instructions. |

## Commands

### `pr` (default)

**What it does:** Compares `headRefOid` to `~/.local/state/pr-cli/last-head.json` and loads **`prompts/review.md`** (add / first run / same-HEAD compact) or **`prompts/update.md`** (new commits). Runs `agent` with `--print`, parses a final **`json`** fence (`title`, `body`, and **`pr`** if you did not pass a PR on the argv), renders markdown in the terminal, then **Enter** posts **`gh pr review --comment`** or **Esc** cancels.

**Forms:** `pr`, `pr <pr>`

---

### `pr review`

**What it does:** Loads **`prompts/review.md`** — always first-pass; same JSON + TTY + `gh pr review` flow as default `pr`.

**Form:** `pr review [<pr>]`

---

### `pr update`

**What it does:** Loads **`prompts/update.md`** — always follow-up; same JSON + TTY + `gh pr review` flow.

**Form:** `pr update [<pr>]`

---

### `pr create`

**What it does:** Loads **`prompts/create.md`**. Same **`--print`** / JSON / markdown terminal preview pattern; **Enter** → `gh pr create` or **Esc** cancel.

**Form:** `pr create`
