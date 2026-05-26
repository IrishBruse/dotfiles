# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/.bin/`; each CLI has a folder under `tools/<name>/`.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root (or `just validate`); it must pass.
- Each tool folder that is imported across folders must have an `api.ts` that defines the public contract: every exported type (full shape), function (params and return type), and const (explicit type). Implementations live in other modules; `api.ts` delegates to them. Do not use bare `export { x } from "./other.ts"` re-exports in `api.ts`. Other files in the same folder may `import type` from `api.ts`.

## Cross-folder imports

ESLint `cross-folder-api` requires imports from another tool folder to go through that folder's `api.ts` only.

## Install

```bash
cd tools && npm install && npm link
```

Or from repo root: `just install-all` then `just link`.
