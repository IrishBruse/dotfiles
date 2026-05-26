# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/.bin/`; each CLI has a folder under `tools/<name>/`.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root (or `just validate`); it must pass.

## api.ts

Folders imported from other tool folders expose an `api.ts` as their only cross-folder entry point (`cross-folder-api` ESLint rule). The file is the public contract: full exported type shapes, typed functions and consts, and delegating implementations (no bare `export { x } from "./other.ts"` re-exports). Same-folder code may `import type` from `api.ts`.

### Function JSDoc

Summary, `@param` per argument, and `@return`.

### Type and const JSDoc

Brief `/** ... */` on each exported type or const.
