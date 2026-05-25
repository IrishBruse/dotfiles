# Dotfiles tools

Single Node package (`tools/package.json`) with one `tsconfig.json`. Entry stubs live in `tools/bin/`; each CLI has a folder under `tools/<name>/`.

## Rules

- Do not use ENV vars in tools unless explicitly requested.
- Before finishing work that touches TypeScript here, run `npm run validate` from repo root (or `just validate`); it must pass.

## Install

```bash
cd tools && npm install && npm link
```

Or from repo root: `just install-all` then `just link`.
