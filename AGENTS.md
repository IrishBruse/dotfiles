# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Dont add excessive edge case handling to script keep them simple and doing what the user requested
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## VS Code keybindings

- Edit **`vscode/keybindings/custom.json`** (`bindings` array). Schema: **`vscode/keybindings/keybindings.schema.json`**. Generator: **`vscode/keybindings/gen.ts`** — writes **`home/.config/Code/User/keybindings.json`** (Linux) and **`home/Library/Application Support/Code/User/keybindings.json`** (macOS; merges defaults, negatives, and custom).
- **Do not ask to run `gen.ts` manually** when only `custom.json` changes: the workspace task **“Vscode Keybind”** (`.vscode/tasks.json`, **Run on: folder open**) runs **`node --watch --watch-path=custom.json gen.ts`** from **`vscode/keybindings/`**, so outputs stay in sync while that task is running.

## CLI Tools

Packages live under `tools/`. Install per package: `cd tools/<name> && npm install && npm link` (or run `node tools/<name>/bin/<cmd>.js …`).

- **`tools/archview`** — **`archview analyze`** reads **`tsconfig.json`** in **`cwd`** via **`ts-morph`**, writes topic pages under **`.context/architecture/`** (`external-packages.md`, `entrypoints.md`, `roots-and-orphans.md`, `graph-metrics.md`, `import-edges.md`, `file-catalog.md`). Install: `cd tools/archview && npm install && npm link` (or **`node tools/archview/bin/archview.js analyze`**). Agent skill: **`tools/archview/SKILL.md`**; symlink **`.agents/skills/archview/SKILL.md`** → **`../../../tools/archview/SKILL.md`** (same file).

- **`tools/atlassian`** — uses Atlassian CLI (`acli`) where noted.
  - **`jira-board`** — Interactive TUI from `.agents/skills/jira-tickets/SKILL.md` (optional path); **`jira-board sync`** refreshes that markdown from Jira via `acli`.
  - **`confluence-clone`** — Clone a Confluence page subtree to local markdown (`acli confluence page view …`).

- **`tools/pr`** — GitHub PR helper: runs Cursor Agent with prefetched workspace (`gh`, `code --wait`, Node 24+). See `tools/pr/README.md` for env vars (`PR_CLI_WORKSPACE_ROOT`, `PR_CLI_WORK`, etc.).
  - **`pr`** (no subcommand) — Infers **`update`** vs **`create`** from repo state; a GitHub PR URL as the first arg runs **`review`**.
  - **`pr create`** — New PR from current branch (agent + `gh pr create`).
  - **`pr update [<pr>]`** — Refresh title/body (`gh pr edit`).
  - **`pr review <pr>`** — Agent review → preview → `gh pr review --comment` (`<pr>`: number, URL, or branch).
  - Common flags: **`--print-prompt`**, **`--no-agent`**, **`--dir`**, **`--opus`**, **`--codex`**; **`--help`**.
