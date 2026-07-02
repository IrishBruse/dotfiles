# Dotfiles

### home/

Files here mirror `~` and are manually stowed by the user. You can assume that any path in this will be mirrored to its `~/` equivalent.

In docs and tool code, use the **runtime** path under `~/`, not the repo path under `home/`.
Example: `~/.agents/skills/jira-board/`, not `home/.agents/skills/jira-board/` or `dotfiles/home/.agents/...`.
Tools should resolve these with `homedir()` from `node:os`, not relative paths from `tools/` into the dotfiles tree.

### linux/

- `apt.csv` packages backup
- `flatpak.csv` packages backup

### macos/

- `Brewfile` brew package backup
- `open.ts` syncs Brewfile and mirrors `ui-platform-workspace/.cursor/skills/jira` into `home/.agents/jira` (gitignored, stowed to `~/.agents/jira`)

### home/.config/Code/User/settings.json

Linux vscode settings

### home/Library/Application Support/Code/User/settings.json

Macos vscode settings

### vscode/keybindings

TypeScript and JSON used to generate VS Code keybindings.
`gen.ts` is running in a watcher skip running.

### vscode/theme

Custom VS Code UI CSS.

### tools/

- `jira` - Pull, push, and browse local ticket markdown under `./jira/` (`jira pull`, `jira push`, interactive `jira` in a TTY); dashboard board sync in `dashboard/jira-sync.ts`
- `confluence` - Clone a Confluence page subtree to local markdown via acli
- `pr` - GitHub pull request helper: auto create or update via Cursor agent skills; `pr fix` for failed CI
- `interpolate` - Expand markdown prompt templates (builtins, env, conditions, shell snippets)
- `md` - Render piped or file markdown in the terminal
- `endpoint` - Local HTTP catch-all that appends each request as one JSONL line; prints only the listen URL
- `memory` - Scoped agent lessons under `~/.agents/memory/` (`global.json`, `repos/<repo>.json`, `misc/<path>.json`; `-g` for global). Run bare `memory` at session start; `add`, `view`, `rm`
- `dotfiles` - Stow `home/` into ~ with a colored summary (linked, removed, unchanged)
- `start` - Detect project type (npm, Go, .NET) and exec the dev server with color env preserved
- `sprint` - Print previous, current, and next sprint date blocks, `sprint <n>` for one sprint, or `sprint YYYY-MM-DD` for the sprint containing that date

### dashboard

Local start page Vite app at `dashboard/` (React + TypeScript).
Dev and preview listen on port `54321`.
Run `npm run dev`, `build`, or `preview` from that directory.
The VS Code **Dashboard** task starts the dev server on folder open.
See `dashboard/AGENTS.md` for UI style guide.
