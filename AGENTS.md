# Dotfiles

### home/

Files here mirror `~` and are manually stowed by the user. You can assume that any path in this will be mirrored to its `~/` equivalent.

In docs and tool code, use the **runtime** path under `~/`, not the repo path under `home/`.

### home/.config/Code/User/settings.json

Linux vscode settings

### home/Library/Application Support/Code/User/settings.json

Macos vscode settings

### vscode/keybindings

TypeScript and JSON used to generate VS Code keybindings.
`gen.ts` is running in a watcher skip running.

### Skills

Agent skills live in two stowed locations under `home/`, mirrored to `~/`.

- `home/.agents/skills/` -> `~/.agents/skills/` - general-purpose, cross-project skills
- `home/.cursor/skills/` -> `~/.cursor/skills/` - **Work only skills**

`jira` skill should not reference mcp or clis keep it generic in its content.