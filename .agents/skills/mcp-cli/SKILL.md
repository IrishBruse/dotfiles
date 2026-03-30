---
name: mcp-cli
description: Use this skill when working with the mcp CLI tool.
  Covers calling MCP server tools, listing servers/tools, OAuth auth,
  debugging errors, extending the CLI, and the confluence-sync utility.
---

# MCP CLI

CLI wrapper for MCP servers configured in `~/.cursor/mcp.json`. The tool is npm-linked globally, so `mcp` is available without a build step.

## Quick Reference

```bash
mcp list                              # List configured MCP servers
mcp <server> tools                    # List tools on a server
mcp <server> <tool> --help            # Show a tool's schema/args
mcp <server> <tool> --key value ...   # Call a tool with flags
mcp <server> auth                     # Re-run OAuth flow
mcp <server> logout                   # Clear stored token
confluence-sync <cloudId> <spaceKey>  # Sync Confluence space to Markdown
```

## How It Works

1. Reads server configs from `~/.cursor/mcp.json` (`mcpServers` map).
2. For HTTP servers, resolves auth via (in priority order):
   - `--token <value>` CLI flag
   - `MCP_<SERVER>_TOKEN` env var
   - Static `Authorization` header from config
   - OAuth 2.0 + PKCE flow (tokens cached at `~/.config/mcp-cli/tokens.json`)
3. Initializes a JSON-RPC session with the server (Streamable HTTP transport, `Mcp-Session-Id` header).
4. Calls tools via `tools/call` and renders results with `jq` formatting.

## Key Files

| File | Purpose |
|------|---------|
| `mcp.ts` | Main CLI entry: arg parsing, auth resolution, server init, tool calls, output formatting |
| `oauth.ts` | OAuth 2.0 + PKCE: discovery, registration, code exchange, token refresh, local callback server |
| `bin/mcp.js` | Shebang entry that imports `mcp.ts` via `tsx` |
| `bin/confluence-sync.js` | Bulk Confluence downloader registered as `confluence-sync` |
| `~/.cursor/mcp.json` | Server configuration (shared with Cursor IDE) |
| `~/.config/mcp-cli/tokens.json` | Cached OAuth tokens per server |

## Common Workflows

### Discovering available servers and tools

```bash
mcp list                    # see all servers, transport type, auth status
mcp atlassian tools         # list tools on a specific server
mcp atlassian getConfluencePage --help   # inspect a tool's arguments
```

### Calling a tool

```bash
# Required args only
mcp atlassian getConfluencePage --cloudId abc123 --pageId 456

# With optional args
mcp atlassian getPagesInConfluenceSpace --cloudId abc123 --spaceId 789 --limit 50 --contentFormat markdown

# Boolean/null coercion
mcp github search_repositories --query "mcp" --private false
```

### Handling auth issues

```bash
# Check if a server has stored tokens
mcp list    # look for [oauth] or [token] annotations

# Force re-authentication
mcp atlassian auth

# Clear a bad token
mcp atlassian logout

# Use a one-off token without storing
mcp atlassian tools --token ghp_xxxxx

# Use env var for CI/scripts
MCP_ATLASSIAN_TOKEN=ghp_xxxxx mcp atlassian tools
```

### Syncing Confluence spaces

```bash
# Get cloud ID
mcp atlassian getAccessibleAtlassianResources

# List spaces
mcp atlassian getConfluenceSpaces --cloudId abc123

# Download everything
confluence-sync abc123 PROD ./docs/prod
```

## Auth & Tokens

- Tokens stored at `~/.config/mcp-cli/tokens.json` (keyed by server name).
- Access tokens auto-refresh when within 60s of expiry.
- `mcp <server> auth` forces a fresh OAuth flow.
- `mcp <server> logout` deletes the stored token.
- `--token <value>` or `MCP_<SERVER>_TOKEN` bypasses stored tokens entirely.

### OAuth flow detail

1. Discovery via `/.well-known/oauth-authorization-server`
2. Dynamic client registration (fresh client per auth flow)
3. PKCE: SHA-256 verifier/challenge, base64url-encoded
4. Local callback server on random port for redirect
5. Browser opened with `open` command
6. Code exchanged for tokens, stored with expiry timestamp

## Error Handling

- MCP JSON-RPC errors are parsed and displayed with missing-field hints.
- `--help` on a tool shows usage and required/optional flags.
- HTTP errors include status codes and response body snippets.
- When a tool call fails with validation errors, the usage line is printed above the error for quick reference.
- Content-level `MCP error` text is parsed for structured error data.

### Debugging a failed tool call

```bash
# Step 1: Verify server is reachable and auth works
mcp <server> tools

# Step 2: Check the tool's schema
mcp <server> <tool> --help

# Step 3: Call with required args, inspect error for missing fields
mcp <server> <tool> --requiredArg value

# Step 4: Check for auth issues
mcp list    # verify [oauth] or [token] shows up
```

## When Modifying This Code

- It's TypeScript (`mcp.ts`, `oauth.ts`) executed via Node with `--import tsx` (see `bin/mcp.js`).
- No build step needed — the tool is npm-linked.
- Config lives at `~/.cursor/mcp.json`, tokens at `~/.config/mcp-cli/tokens.json`.
- Run `npx tsc --noEmit` from `tools/mcp-cli/` to typecheck.
- Follow existing code patterns: use `node:` prefixed imports, `errStyle()` for errors, `dim()` for secondary info.
- The `_cache` Map in `mcp.ts` handles session/tool caching with 5-minute TTL — invalidate or extend as needed.
- New commands go in `main()` as additional `if (sub === "...")` branches.
- OAuth changes should stay in `oauth.ts` — `mcp.ts` only calls the high-level `getOAuthToken()`.
