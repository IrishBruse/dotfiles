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

In that workspace the agent writes **`PR.md`** (`# Title`, blank line, body). For **`pr update`** / **`pr review`**, the CLI prefetches the PR into **`PR.md`** first; the agent overwrites it. The CLI opens **`PR.md`** in VS Code (`code --wait`), then **`[y/N]`** before **`gh pr create`**, **`gh pr edit`**, or **`gh pr review --comment`**. The first `# …` line is the title; the rest is the body.

Jira: with the **jira-tickets** skill at **`<dotfiles>/.agents/skills/jira-tickets`** or **`~/.agents/skills/jira-tickets`**, the CLI writes **`jira-tickets-board.md`** (a snapshot of **`SKILL.md`**) and copies each full ticket file from **`references/{me,team,unassigned}/<KEY>.md`** into **`{KEY}.md`** for every issue key that appears on that board (no Jira API). For **review** / **update**, keys in the PR body get the same treatment (if a key has no reference file, review flow may still drop a board-only fallback into **`{KEY}.md`** as before).

**Work:** set **`PR_CLI_WORK=true`**. Each subcommand appends work-only markdown beside its **`prompt.md`**: **`create/prompt.work.md`**, **`update/prompt.work.md`**, **`review/prompt.work.md`**. **`pr create`** / **`pr update`** require the PR title to begin with **`NOVACORE-<digits>`** (after the agent and again after you edit **`PR.md`**). Unset at home — no check.

## Commands

- **`pr`** — If the current branch has an open PR, runs **`pr update`**; otherwise **`pr create`**.
- **`pr review <pr>`** — Agent review → preview → post comment.
- **`pr update [<pr>]`** — Refresh title/body; PR optional if **`gh pr view`** resolves one.
- **`pr create`** — New PR from current branch (`git diff origin/main` and optional jira-tickets board + per-ticket **`*.md`** in workspace).
