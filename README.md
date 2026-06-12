# dotfiles

Personal config and TypeScript CLI tools.

## Setup

```fish
./init.fish     # git hooks, cursor symlinks, fish completions
./stow.fish     # stow home/ into ~ (expects repo at ~/dotfiles)
just install-all
just link       # global npm link for tools/
```

## Layout

- `home/` - mirrors `~` (`.config`, `.cursor`, fish, hypr, VS Code settings)
- `tools/` - CLIs (`jira`, `pr`, `sprint`, `commit`, ...)
- `vscode/` - keybindings and theme

Run `just` to typecheck TypeScript projects.
