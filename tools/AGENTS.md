# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/.bin/`; each CLI has a folder under `tools/<name>/`. `start` is a native C binary built with `make -C start` into `.bin/start`. `homepage` is a nested Vite app (`tools/homepage/`) with its own `package.json`; the `homepage` bin runs `npm run dev|build|preview` there.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root
- Paths under `~/.agents/` (skills, memory, etc.): resolve with `homedir()` from `node:os`, not relative paths into `dotfiles/home/`.
  Docs and comments should say `~/.agents/...`, not `home/.agents/...`

## dotfiles

`dotfiles -v` prints unchanged stow paths as a tree. Dim nodes are parent folders for grouping only; stow links the normal-weight paths (individual files, or a whole directory when the target path does not already exist). Unicode box-drawing characters (`├──`, `└──`, `│`) are intentional here for readable tree lines. Plain ASCII is not required for this output.

Folders imported from other tool folders expose an `api.ts` as their only cross-folder entry point (`cross-folder-api` ESLint rule). The file is the public contract: full exported type shapes, typed functions and consts, and delegating implementations (no bare `export { x } from "./other.ts"` re-exports). Same-folder code may `import type` from `api.ts`.

### Updates

Any updates to the api.ts contract must get explicit approval from the user.
Print the proposed change to the api before doing any code changes.

### Function JSDoc

Summary, `@param` per argument, and `@return`.

### Type and const JSDoc

Brief `/** ... */` on each exported type or const.
