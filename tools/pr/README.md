# pr-cli

Runs [Cursor Agent](https://cursor.com) (`agent`, with `cursor-agent` as fallback if missing) with **`prompt.md`** per command under **`src/commands/{review,update,create}/`**. Needs **`gh`**, **`code`** (VS Code CLI, for `code --wait` preview), and Node **24+**.

## Install

```bash
cd tools/pr
npm install
npm link
```

Run without linking: `node /path/to/tools/pr/bin/pr.js …`

## Usage

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Print usage and exit |

The agent cwd is a **stable directory** under the OS temp tree: **`<tmpdir>/pr-cli/<repo-path>/<branch>/`** (default **`PR_CLI_WORKSPACE_ROOT`** = **`os.tmpdir()`**). **`repo-path`** is the repo relative to **`$HOME`** when it lies under your home directory (e.g. **`~/projects/acme/app`** → **`projects/acme/app`**); otherwise **`_abs/<slug-of-full-path>`**. Each run **clears** that folder and refills it. Override the root with **`PR_CLI_WORKSPACE_ROOT`** (absolute or **`~/…`**).

In that workspace the agent writes **`PR.md`** (`# Title`, blank line, body). For **`pr review`**, the CLI prefetches the PR into **`PR.md`** first; the agent overwrites it. For **`pr update`**, the CLI puts GitHub’s current title/body in **`CURRENT.md`** (read-only snapshot); the agent writes only **`PR.md`**. The CLI opens **`PR.md`** in VS Code (`code --wait`). **`pr create`** runs **`gh pr create`** as soon as you close the editor (non-empty title/body). **`pr update`** / **`pr review`** still prompt **`[y/N]`** before **`gh pr edit`** / **`gh pr review --comment`**. The first `# …` line is the title; the rest is the body.

Jira: with the **jira-tickets** skill at **`<dotfiles>/home/.agents/skills/jira-tickets`** or **`~/.agents/skills/jira-tickets`**, the CLI writes **`jira-tickets-board.md`** (a snapshot of **`SKILL.md`**) and copies full ticket files from **`references/{me,team,unassigned}/<KEY>.md`** into **`{KEY}.md`** only for the **first** Jira key in the **PR title** (on **update** / **review**) or the **branch name** (on **create**), **plus** any other keys found in the **PR body** (or in the **host PR template** on **create**). Not every ticket listed on the board. If expected keys have no on-disk reference, the CLI may still write a board-text fallback to **`{KEY}.md`** as before (no Jira API).

**Work:** set **`PR_CLI_WORK=true`**. Each subcommand appends work-only markdown beside its **`prompt.md`**: **`create/prompt.work.md`**, **`update/prompt.work.md`**, **`review/prompt.work.md`**. **`pr create`** / **`pr update`** require the PR title to begin with **`NOVACORE-<digits>`** (after the agent and again after you edit **`PR.md`**). Unset at home — no check.

## Commands

- **`pr`** — Prints a **one-line status** (e.g. `Updating PR #N — <url>` or `Creating a new pull request from the current branch…`) then runs **`pr update`** or **`pr create`**. If the first argument is a **GitHub PR URL** (`…/pull/<number>…`), prints a short **review** line and runs **`pr review <url>`** (same as the **`review`** command).
- **`pr review <pr>`** — Agent review → preview → post comment (`<pr>` is a number, URL, or branch; **`gh`-compatible).
- **`pr update [<pr>]`** — Refresh title/body; PR optional if **`gh pr view`** resolves one.
- **`pr create`** — New PR from current branch (`git diff origin/main` and optional jira-tickets board + per-ticket **`*.md`** in workspace).
