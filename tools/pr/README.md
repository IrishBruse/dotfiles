# pr-cli

Runs [Cursor Agent](https://cursor.com) (`agent`, with `cursor-agent` as fallback if missing) with prompts from **`~/.config/interpolate/`** (`pr-create`, `pr-update`, `pr-review`), expanded by the **interpolate** CLI. Needs **`gh`**, **`interpolate`** on PATH, **`code`** (VS Code CLI, for `code --wait` preview), and Node **24+**.

## Install

```bash
cd tools/pr
npm install
npm link
```

Also link **interpolate** (`just link-interpolate` or `cd tools/interpolate && npm link`) and stow `home/.config/interpolate/` so prompts land in `~/.config/interpolate/`.

Run without linking: `node /path/to/tools/pr/bin/pr.js …`

## Usage

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Print usage and exit |

The agent cwd is an **empty temp directory** for **`PR.md`** only. GitHub and git context are embedded in the expanded interpolate prompt (shell blocks run from the repo). The CLI opens **`PR.md`** in VS Code (`code --wait`). **`pr create`** runs **`gh pr create`** after you close the editor. **`pr update`** / **`pr review`** prompt **`[y/N]`** before **`gh pr edit`** / **`gh pr review --comment`**.

Jira: with the **jira-tickets** skill installed, the CLI embeds **`jira-tickets-board.md`** and per-key **`{KEY}.md`** copies in the prompt (title + body keys on update/review; branch + template on create).

**Work:** set **`PR_CLI_WORK=true`**. Enables **`?work:`** lines in the interpolate prompts. **`pr create`** / **`pr update`** require the PR title to begin with **`NOVACORE-<digits>`**.

**Standalone PR helper:** `interpolate pr` or `a !pr` uses a lighter template that runs **`gh pr create`** / **`gh pr edit`** directly (no **`PR.md`** workspace flow).

## Commands

- **`pr`** — Prints a one-line status then runs **`pr update`** or **`pr create`**. A GitHub PR URL as the first arg runs **`pr review <url>`**.
- **`pr review <pr>`** — Agent review, preview, post comment.
- **`pr update [<pr>]`** — Refresh title/body; PR optional if **`gh pr view`** resolves one.
- **`pr create`** — New PR from current branch.
