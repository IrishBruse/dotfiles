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

After the agent writes **`Title.md`** and **`Body.md`**, the CLI opens a temp markdown file in VS Code, waits until you close it, then asks **`[y/N]`** before **`gh pr create`**, **`gh pr edit`**, or **`gh pr review --comment`**.

Jira ticket snippets: if the PR body mentions keys like **`PROJ-123`**, the CLI copies matching files from **`<dotfiles>/.agents/skills/jira-tickets`** or **`~/.agents/skills/jira-tickets`** into the workspace (no Jira API).

## Commands

- **`pr`** — If the current branch has an open PR, runs **`pr update`**; otherwise **`pr create`**.
- **`pr review <pr>`** — Agent review → preview → post comment.
- **`pr update [<pr>]`** — Refresh title/body; PR optional if **`gh pr view`** resolves one.
- **`pr create`** — New PR from current branch (`git diff origin/main` in workspace).
