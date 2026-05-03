# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Dont add excessive edge case handling to script keep them simple and doing what the user requested
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## VS Code keybindings

- Edit **`vscode/keybindings/custom.json`** (`bindings` array). Schema: **`vscode/keybindings/keybindings.schema.json`**. Generator: **`vscode/keybindings/gen.ts`** — writes **`home/.config/Code/User/keybindings.json`** (Linux) and **`home/Library/Application Support/Code/User/keybindings.json`** (macOS; merges defaults, negatives, and custom).
- **Do not ask to run `gen.ts` manually** when only `custom.json` changes: the workspace task **“Vscode Keybind”** (`.vscode/tasks.json`, **Run on: folder open**) runs **`node --watch --watch-path=custom.json gen.ts`** from **`vscode/keybindings/`**, so outputs stay in sync while that task is running.

## CLI Tools

Packages live under `tools/`. Install per package: `cd tools/<name> && npm install && npm link`
