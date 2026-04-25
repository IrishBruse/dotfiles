# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Dont add excessive edge case handling to script keep them simple and doing what the user requested
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## CLI Tools

Packages live under `tools/`. Install per package: `cd tools/<name> && npm install && npm link` (or run `node tools/<name>/bin/<cmd>.js …`).

- **`tools/atlassian`** — Node 24+; uses Atlassian CLI (`acli`) where noted.
  - **`jira-board`** — Interactive TUI from `.agents/skills/jira-tickets/SKILL.md` (optional path); **`jira-board sync`** refreshes that markdown from Jira via `acli`.
  - **`confluence-clone`** — Clone a Confluence page subtree to local markdown (`acli confluence page view …`).

- **`tools/ts-callgraph`** — Node 24+; loads a project via `tsconfig.json`, resolves calls with the type checker (`ts-morph`), writes **Mermaid** under **`.context/architecture/`** by default: **`full.mmd`**, **`full-flat.mmd`**, **`modules/*.mmd`**. **`ts-callgraph view`** writes **`<stem>-view.html`** (Mermaid UMD from CDN, pan, zoom, fit) and **opens it in the default browser**; **`view --no-open`** skips launch. Flags include **`--out`**, **`--flat`**, **`--max-edges`**, **`view --file`**, **`view --out`**.

- **`tools/pr`** — GitHub PR helper: runs Cursor Agent with prefetched workspace (`gh`, `code --wait`, Node 24+). See `tools/pr/README.md` for env vars (`PR_CLI_WORKSPACE_ROOT`, `PR_CLI_WORK`, etc.).
  - **`pr`** (no subcommand) — Infers **`update`** vs **`create`** from repo state; a GitHub PR URL as the first arg runs **`review`**.
  - **`pr create`** — New PR from current branch (agent + `gh pr create`).
  - **`pr update [<pr>]`** — Refresh title/body (`gh pr edit`).
  - **`pr review <pr>`** — Agent review → preview → `gh pr review --comment` (`<pr>`: number, URL, or branch).
  - Common flags: **`--print-prompt`**, **`--no-agent`**, **`--dir`**, **`--opus`**, **`--codex`**; **`--help`**.
