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
| `PR_TITLE_JIRA_KEY` | **Work-only toggle:** optional project key (e.g. `NOVACORE`). When **set**, prompts require a PR title matching `KEY-<digits>`; the CLI validates **`Title.md`** for **`pr create`** and **`pr update`** before `gh`. When **unset**, no Jira ID is required. Not a CLI flag — global env only. |
| `PR_AGENT` | Binary for [Cursor print mode](https://www.cursor.com/docs/cli/headless) (default: `agent`, with `cursor-agent` tried if the first is missing). The CLI always passes **`--trust`** with **`--print`** so agent runs in temp PR workspaces without an interactive trust prompt. |
| `PR_JIRA_SKILL_DIR` | Optional absolute path to the **jira-tickets** skill folder (contains `SKILL.md` and `references/**`). Defaults to **`<dotfiles>/.agents/skills/jira-tickets`** then **`~/.agents/skills/jira-tickets`**. When the PR body mentions Jira keys, copies each **`references/**/{KEY}.md`** into the workspace as **`{KEY}.md`** (e.g. **`NOVACORE-123.md`**) with no added headers — no Jira API calls. |
| `PR_AGENT_TIMEOUT_MS` | Max time in milliseconds for one `agent -p` run (default: 1,200,000 = 20 minutes). |
| `CURSOR_API_KEY` | Required for headless `agent` in some setups; see Cursor CLI auth docs. |
| `PR_REVIEW_NO_CONFIRM` | Set to `1` to skip the markdown preview and TTY confirm for **`pr review`**, and post the comment after **`Title.md`** / **`Body.md`** are read. |
| `PR_UPDATE_NO_CONFIRM` | Set to `1` to skip preview and TTY confirm for **`pr update`** and run **`gh pr edit`** after **`Title.md`** / **`Body.md`** and title policy checks. |
| `PR_CREATE_NO_CONFIRM` | Set to `1` to skip preview and TTY confirm for **`pr create`** and run **`gh pr create`** after **`Title.md`** / **`Body.md`** and title policy checks. |
| (none) | The agent must write **`Title.md`** and **`Body.md`** in the temp workspace. The CLI copies **`title`** / **`body`** to **`pr-review-<num>.json`**, **`pr-update-<num>.json`**, or **`pr-create.json`** for retry. On failed **`gh`**, **`lastError`** is added. |

HEAD state for default `pr` add/update is stored at **`~/.local/state/pr-cli/last-head.json`** (updated after each successful posted review for that PR).

## Prompt files (`src/commands/…/prompt.md`)

| Path | Command | Role |
|------|---------|------|
| `review/prompt.md` | `pr review` | First-pass review; agent writes **`Title.md`** + **`Body.md`** in the prefetched workspace. |
| `update/prompt.md` | `pr update`, default `pr` (update) | Title + body refresh; **`Title.md`** / **`Body.md`**; appends **`create/work/prompt.md`** when `PR_TITLE_JIRA_KEY` is set. |
| `create/prompt.md` | `pr create`, default `pr` (create) | New PR; workspace has **`diff.patch`** (+ optional template); **`Title.md`** / **`Body.md`**. |
| `create/work/prompt.md` | `pr create`, **`pr update`** | **Only if** `PR_TITLE_JIRA_KEY` set — Jira title + jira-board skill; appended to create base or update base (wording adjusted for update). |

## Commands

### `pr` (default)

**What it does:** If the current branch already has an open PR, runs **`pr update`** (refresh title/body). Otherwise runs **`pr create`** (new PR). Use **`pr review`** explicitly for review comments.

**Forms:** `pr` (optional extra args are passed through to the inferred command)

---

### `pr review`

**What it does:** Prefetches at the temp workspace root (see earlier docs: **`view.json`**, **`commits.txt`** (one line per commit), **`checks.json`**, **`review-threads.json`**, **`files.json`**, **`threads.json`**, **`diff.patch`**, optional **`{KEY}.md`** Jira copies). Runs **`agent`** with **`cwd`** set there; the agent **writes `Title.md` and `Body.md`**. The CLI reads those files, previews markdown on stdout, **Enter** → **`gh pr review <pr> --comment -F`**, **Esc** cancels. With **`PR_REVIEW_NO_CONFIRM=1`**, skips preview and posts when the files are valid.

**Form:** `pr review <pr>` (URL or number; required)

---

### `pr update`

**What it does:** Same prefetched workspace as **`pr review`**. The agent writes **`Title.md`** and **`Body.md`**; the CLI previews and runs **`gh pr edit`**. When **`PR_TITLE_JIRA_KEY`** is set, appends the work Jira appendix and validates **`Title.md`** before **`gh pr edit`**.

**Form:** `pr update [<pr>]` — PR optional when **`gh pr view`** resolves one for the current branch.

---

### `pr create`

**What it does:** Creates a temp workspace with **`diff.patch`** (`git diff origin/main` from your cwd) and an optional copied **`PULL_REQUEST_TEMPLATE.md`**. Runs **`agent`**; it writes **`Title.md`** and **`Body.md`**. Previews then **Enter** → **`gh pr create --title … --body-file …`**. **`PR_CREATE_NO_CONFIRM=1`** skips preview. **`PR_TITLE_JIRA_KEY`** enables the work appendix and validates the title.

**Form:** `pr create`
