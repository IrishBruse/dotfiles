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
| `PR_TITLE_JIRA_KEY` | **Work-only toggle:** optional project key (e.g. `NOVACORE`). When **set** in your environment (e.g. work repo / `direnv`), prompts require a PR title matching `KEY-<digits>` and the agent uses Jira MCP where applicable; the CLI validates titles for **`pr update`** (and create when implemented) before `gh` commands. When **unset** (default for personal use), no Jira ID is required on the title. Not a CLI flag — global env only. |
| `PR_AGENT` | Binary for [Cursor print mode](https://www.cursor.com/docs/cli/headless) (default: `agent`, with `cursor-agent` tried if the first is missing). The CLI always passes **`--trust`** with **`--print`** so agent runs in temp PR workspaces without an interactive trust prompt. |
| `PR_AGENT_TIMEOUT_MS` | Max time in milliseconds for one `agent -p` run (default: 1,200,000 = 20 minutes). |
| `CURSOR_API_KEY` | Required for headless `agent` in some setups; see Cursor CLI auth docs. |
| `PR_REVIEW_NO_CONFIRM` | Set to `1` to skip the markdown preview and TTY confirm for `pr review` (e.g. in scripts or CI), and post the comment if parsing succeeds. |
| `PR_UPDATE_NO_CONFIRM` | Set to `1` to skip preview and TTY confirm for **`pr update`** and run **`gh pr edit`** when parsing and title policy checks succeed. |
| (none) | After **`pr review`**, **`pr-review-<num>.json`** is written; after **`pr update`**, **`pr-update-<num>.json`**. On failed **`gh`** commands, **`lastError`** is added. In a TTY you can **Enter** to retry or **Esc** to quit without applying. |

HEAD state for default `pr` add/update is stored at **`~/.local/state/pr-cli/last-head.json`** (updated after each successful posted review for that PR).

## Prompt files (`src/commands/…/prompt.md`)

| Path | Command | Role |
|------|---------|------|
| `review/prompt.md` | `pr review`, default `pr` (add) | First-pass review: shared + first-pass body; `{{prLine}}`, `{{hintBlock}}`, `{{workJiraTitleSection}}` when `PR_TITLE_JIRA_KEY` set; fenced JSON (`title`, `body`, optional `pr`). |
| `update/prompt.md` | `pr update`, default `pr` (update) | Title + body refresh from prefetched files in the agent workspace root; appends **`create/work/prompt.md`** when `PR_TITLE_JIRA_KEY` is set (same Jira title rules as create). |
| `create/prompt.md` | `pr create` | New PR from branch; JSON `title` / `body`. |
| `create/work/prompt.md` | `pr create`, **`pr update`** | **Only if** `PR_TITLE_JIRA_KEY` set — Jira title + jira-board skill; appended to create base or update base (wording adjusted for update). |

## Commands

### `pr` (default)

**What it does:** If the current branch already has an open PR, runs **`pr update`** (refresh title/body). Otherwise runs **`pr create`** (new PR). Use **`pr review`** explicitly for review comments.

**Forms:** `pr` (optional extra args are passed through to the inferred command)

---

### `pr review`

**What it does:** Prefetches **`view.json`**, **`files.json`**, **`threads.json`** (pretty-printed), and **`diff.patch`** at the root of a temp workspace (agent **`cwd`**), loads **`src/commands/review/prompt.md`**, runs **`agent -p --output-format stream-json --stream-partial-output`** (see env above). Progress (model, streaming assistant text, read/write tools) is printed to **stderr**; the final **`result`** string is used to find the last **`json`** fence (`title`, `body`). Then a markdown preview on stdout, **Enter** → **`gh pr review <pr> --comment -F`**, **Esc** cancels. With **`PR_REVIEW_NO_CONFIRM=1`**, skips preview and posts when parsing succeeds.

**Form:** `pr review <pr>` (URL or number; required)

---

### `pr update`

**What it does:** Creates a temp workspace and prefetches **`view.json`**, **`files.json`**, **`threads.json`** (pretty-printed), and **`diff.patch`** via **`gh`** — same layout as **`pr review`**. Runs **`agent`** to propose an updated **title** and **description**, then previews and runs **`gh pr edit --title … --body-file …`**. When **`PR_TITLE_JIRA_KEY`** is set, appends the same work Jira appendix as **`pr create`** and **validates** the title before **`gh pr edit`**.

**Form:** `pr update [<pr>]` — PR optional when **`gh pr view`** resolves one for the current branch.

---

### `pr create`

**What it does:** Loads **`src/commands/create/prompt.md`** (and **`work/prompt.md`** when `PR_TITLE_JIRA_KEY` is set). Same **`--print`** / JSON / markdown terminal preview pattern; **Enter** → `gh pr create` or **Esc** cancel.

**Form:** `pr create`
