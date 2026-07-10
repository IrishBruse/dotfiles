# Ship extra checks

Step 4 of the `ship` skill.

## Discover

Scan the **current repo** for pre-merge or "before finishing" commands:

- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`
- `package.json` scripts
- `Makefile`, `Justfile`, `Cargo.toml`
- CI workflow files under `.github/workflows/`

Collect every command the docs say to run before merge, before finishing, or before opening a PR.

## Run

Run each applicable check.
When a doc scopes a check (e.g. only for TypeScript under `tools/`), run it only when the PR touches that scope.
When CI would run the same check, prefer the closest local equivalent before push.

Fix failures within PR scope.
Stop and report when a failure needs out-of-scope work or CI/workflow changes.

## Done when

Every discovered check in scope has been run and passed.
