# Rules

- The `mcp` tool is npm-linked globally — no build step needed, `mcp` is available immediately after `npm link`.
- `confluence-sync` is also globally available via the same link.
- Config lives at `~/.cursor/mcp.json` (shared with Cursor IDE). Tokens at `~/.config/mcp-cli/tokens.json`.
- TypeScript is executed at runtime via `tsx` (see `bin/mcp.js`). There is no compiled output.
- Typecheck with `npx tsc --noEmit` before considering changes complete.

# Style

- Use `node:` prefixed imports for Node builtins (e.g. `import fs from "node:fs"`).
- Use `errStyle()` for error messages printed to stderr.
- Use `dim()` for secondary/less-important info (paths, transport labels, descriptions).
- Use `highlight()` for user-facing identifiers (server names, tool names, flags).
- Use `value()` for success messages and key values.
- Use `label()` for section headers.
- Prefer `process.exit(1)` for fatal errors, `process.exit(0)` for clean exits.
- Return numeric exit codes from `main()`.
- Keep the JSON-RPC logic in `mcp.ts`, OAuth logic in `oauth.ts` — don't mix concerns.
- New CLI commands go in `main()` as `if (sub === "...")` branches.
- Flag parsing uses `extractFlag()` for named flags and `parseToolArgs()` for `--key value` pairs.
- Error messages should be actionable: include what went wrong and how to fix it when possible.

# Architecture

- `bin/mcp.js` → imports `mcp.ts` (2 lines, shebang + import)
- `mcp.ts` → CLI entry, all command logic, session/caching, JSON-RPC, output formatting
- `oauth.ts` → pure OAuth utilities exported for use by `mcp.ts` (`getOAuthToken`, `loadTokens`, `saveTokens`)
- `bin/confluence-sync.js` → standalone script using `mcp atlassian` via `execSync`
- Session cache (`_cache` Map) stores sessions and tool lists with 5-minute TTL
- Tokens are stored as a JSON object keyed by server name at `~/.config/mcp-cli/tokens.json`

# Testing

- Run `npx tsc --noEmit` to typecheck.
- Manual testing: run `mcp list`, `mcp <server> tools`, `mcp <server> <tool> --help`, and actual tool calls.
- Test auth by running `mcp <server> auth` and verifying tokens appear in `mcp list` output.
- There are no automated tests — verify changes manually.
