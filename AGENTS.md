# Dotfiles

## Rules

- All scripts should be in typescript executed with node 24
- Dont add excessive edge case handling to script keep them simple and doing what the user requested
- Before finishing work that touches TypeScript in this repo, run `npm run validate` (typecheck via `tsc --noEmit` for each project); it must pass

## VS Code keybindings

- **Do not ask to run `gen.ts` manually** its running in a watcher

## CLI Tools

Packages live under `tools/`. Install per package: `cd tools/<name> && npm install && npm link`
