# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/.bin/`; each CLI has a folder under `tools/<name>/`.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root

## dotfiles

`dotfiles -v` prints unchanged stow paths as a tree. Unicode box-drawing characters (`├──`, `└──`, `│`) are intentional here for readable tree lines. Plain ASCII is not required for this output.

Folders imported from other tool folders expose an `api.ts` as their only cross-folder entry point (`cross-folder-api` ESLint rule). The file is the public contract: full exported type shapes, typed functions and consts, and delegating implementations (no bare `export { x } from "./other.ts"` re-exports). Same-folder code may `import type` from `api.ts`.

### Updates

Any updates to the api.ts contract must get explicit approval from the user.
Print the proposed change to the api before doing any code changes.

### Function JSDoc

Summary, `@param` per argument, and `@return`.

### Type and const JSDoc

Brief `/** ... */` on each exported type or const.
