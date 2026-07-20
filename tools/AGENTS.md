# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/.bin/`; each CLI has a folder under `tools/<name>/`. `start` is a native C binary built with `make -C start` into `.bin/start`.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root
- Paths under `~/.agents/` (skills, etc.): resolve with `homedir()` from `node:os`, not relative paths into `dotfiles/home/`.
  Docs and comments should say `~/.agents/...`, not `home/.agents/...`
