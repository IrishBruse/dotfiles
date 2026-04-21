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
| `PR_TITLE_JIRA_KEY` | Optional project key (e.g. `NOVACORE`). When set and you pass a PR for a review command, the CLI checks the PR title starts with `KEY-<digits>` before starting `agent`. The same variable is reflected in the review prompts. |

Review auto add/update state is stored at **`~/.local/state/pr-cli/last-head.json`** (created on first successful default `pr` review with a PR).

## Prompt templates (`prompts/`)

| File | Command | Role |
|------|---------|------|
| `review.md` | `pr review`, default `pr` (add) | First-pass; `{{prLine}}`, `{{hintBlock}}`, `{{jiraBlock}}`. |
| `update.md` | `pr update`, default `pr` (update) | Follow-up; same placeholders. |
| `create.md` | `pr create` | New PR from branch; `{{ticketLine}}`, `{{jiraBlock}}`, steps, JSON **Final response**. |

## Commands

### `pr` (default)

**What it does:** Compares `headRefOid` to `~/.local/state/pr-cli/last-head.json` and loads **`prompts/review.md`** (add / first run / same-HEAD compact) or **`prompts/update.md`** (new commits). Without a PR, the agent should use `gh pr list` per the prompt.

**Forms:** `pr`, `pr <pr>`

---

### `pr review`

**What it does:** Loads **`prompts/review.md`** — always first-pass review.

**Form:** `pr review [<pr>]`

---

### `pr update`

**What it does:** Loads **`prompts/update.md`** — always follow-up review.

**Form:** `pr update [<pr>]`

---

### `pr create`

**What it does:** Loads **`prompts/create.md`**. Runs `agent` with `--print`, expects a final fenced `json` block with `title` and `body`, TTY preview, then **Enter** → `gh pr create` or **Esc** cancel.

**Form:** `pr create [<jira-key>]`
