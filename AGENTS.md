# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## Repo layout

### home/

Files here mirror `~` and are meant to be stowed into the real home directory (`.config`, `.cursor`, `.agents`, VS Code `Code/User`, fish, hypr, etc.).

### home/.config/Code/User/settings.json

Linux vscode settings

### home/Library/Application Support/Code/User/settings.json

Macos vscode settings

### vscode/keybindings

TypeScript and JSON used to generate VS Code keybindings.

### vscode/theme

Custom VS Code UI CSS.

### tools/

- `jira` - View, sync, and initialize local Jira board markdown (jira-tickets skill); pull or copy tickets
- `confluence` - Clone a Confluence page subtree to local markdown via acli
- `pr` - GitHub pull request helper: create, update, and review with agent + gh
- `interpolate` - Expand markdown prompt templates (builtins, env, conditions, shell snippets)
- `md` - Render piped or file markdown in the terminal
- `archscan` - Scan a codebase for architecture metrics (scan, enrich, or both)
- `agent-tool` - Agent workflow helpers (e.g. log corrected mistakes to agent-failures.json)
- `export-cursor-chats` - Export Cursor agent transcripts from ~/.cursor to markdown files
- `sprint` - Print previous, current, and next sprint date blocks, `sprint <n>` for one sprint, or `sprint YYYY-MM-DD` for the sprint containing that date
