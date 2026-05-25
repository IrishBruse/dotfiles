# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Dont add excessive edge case handling to script keep them simple and doing what the user requested
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## Repo layout

### `home/`

Files here mirror `~` and are meant to be stowed into the real home directory (`.config`, `.cursor`, `.agents`, VS Code `Code/User`, fish, hypr, etc.).

### `vscode/keybindings`

TypeScript and JSON used to generate VS Code keybindings.

### `vscode/theme`

Custom VS Code UI CSS.

### `tools/`

Single Node package under `tools/` (`package.json`, `tsconfig.json`) with one folder per CLI (`jira`, `confluence`, `pr`, `interpolate`, etc.). Install and link from `tools/`.

### `scripts/`

Extra npm dependencies used by repo automation (see `Justfile` `install-all`).

### Repo root

`Justfile` for common tasks, root `package.json` for shared TypeScript validation, fish helpers (`init.fish`, `stow.fish`), `open-linux.ts` / `open-mac.ts` (VS Code folder-open tasks), `Brewfile`, and editor metadata under `.vscode` / `.cursor`.
