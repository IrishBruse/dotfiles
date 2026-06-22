# Dotfiles

### home/

Files here mirror `~` and are manually stowed by the user. You can assume that any path in this will be mirrored to its `~/` equivalent

### linux/

- `apt.csv` packages backup
- `flatpak.csv` packages backup

### macos/

- `Brewfile` brew package backup

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

- `jira` - View, sync, and initialize local Jira board markdown (jira-tickets skill); pull or copy tickets
- `confluence` - Clone a Confluence page subtree to local markdown via acli
- `pr` - GitHub pull request helper: auto create or update via Cursor agent skills; `pr fix` for failed CI
- `interpolate` - Expand markdown prompt templates (builtins, env, conditions, shell snippets)
- `md` - Render piped or file markdown in the terminal
- `endpoint` - Local HTTP catch-all that appends each request as one JSONL line; prints only the listen URL
- `memory` - Scoped agent lessons under `~/.agents/memory/` (`global.json`, `repos/<repo>.json`, `misc/<path>.json`; `-g` for global). Run bare `memory` at session start
- `dotfiles` - Stow `home/` into ~ with a colored summary (linked, removed, unchanged)
- `sprint` - Print previous, current, and next sprint date blocks, `sprint <n>` for one sprint, or `sprint YYYY-MM-DD` for the sprint containing that date
