# mcp-cli

CLI wrapper for [Model Context Protocol](https://modelcontextprotocol.io) servers configured in `~/.cursor/mcp.json`. Lets you interact with MCP servers directly from the terminal — list servers, discover tools, call tools with flags, and manage OAuth tokens.

## Quick Start

```bash
mcp list                                    # List configured MCP servers
mcp <server> tools                          # List tools on a server
mcp <server> <tool> --help                  # Show a tool's schema and arguments
mcp <server> <tool> --key value ...         # Call a tool
mcp <server> auth                           # Re-run OAuth flow
mcp <server> logout                         # Clear stored token
```

## Installation

TypeScript executed directly via Node with `tsx` — no build step. The tool is npm-linked globally:

```bash
npm link    # makes `mcp` and `confluence-sync` available globally
```

Typecheck:

```bash
npx tsc --noEmit
```

## How It Works

1. Reads server configs from `~/.cursor/mcp.json` (the `mcpServers` map).
2. For HTTP servers, resolves authentication through one of (in priority order):
   - `--token <value>` CLI flag
   - `MCP_<SERVER_NAME>_TOKEN` environment variable (server name uppercased, non-alphanumeric chars replaced with `_`)
   - Static `Authorization` header from config
   - OAuth 2.0 + PKCE flow (tokens cached at `~/.config/mcp-cli/tokens.json`)
3. Initializes a JSON-RPC session with the server using the MCP Streamable HTTP transport (`Mcp-Session-Id` header).
4. Calls tools via `tools/call` and renders results, piping through `jq` for formatted/colorized output when available.

## Commands

### `mcp list`

List all configured MCP servers from `~/.cursor/mcp.json`. Shows server name, transport type (`http` or `stdio`), location (URL or command), and auth status (`[token]` for static auth, `[oauth]` for stored OAuth tokens).

```bash
MCP Servers (3)  ~/.cursor/mcp.json

  atlassian     http  https://mcp.atlassian.com/v1/sse  [oauth]
  github        http  https://api.github.com/mcp        [token]
```

### `mcp <server> tools`

List all tools available on a server:

```bash
Tools (4)

  getConfluenceSpaces
    Lists Confluence spaces the user has access to
  getConfluencePage
    Gets a single Confluence page by ID
  getPagesInConfluenceSpace
    Lists pages in a Confluence space
  getConfluencePageDescendants
    Gets all descendant pages of a Confluence page
```

### `mcp <server> <tool> --help`

Show a tool's usage line, description, and argument schema:

```bash
Usage

  mcp atlassian getConfluencePage --cloudId <cloudId> --pageId <pageId>

  Gets a single Confluence page by ID

Flags

  --cloudId  string  required
    The Atlassian cloud ID
  --pageId   string  required
    The Confluence page ID
  --contentFormat  string  optional
    values: markdown | storage
```

### `mcp <server> <tool> [--key value ...]`

Call a tool with arguments. Flags are `--key value` pairs. Value coercion:
- `true` / `false` → boolean
- `null` → null
- everything else → string

```bash
mcp atlassian getConfluencePage --cloudId abc123 --pageId 456
mcp atlassian getConfluenceSpaces --cloudId abc123 --keys PROD
mcp github search_repositories --query "mcp server" --limit 5
```

### `mcp <server> auth`

Force a fresh OAuth 2.0 authorization flow. Opens the browser for user consent, stores the resulting tokens.

### `mcp <server> logout`

Delete the stored OAuth token for the server.

## Configuration

### Server config: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "atlassian": {
      "url": "https://mcp.atlassian.com/v1/sse",
      "headers": {}
    },
    "github": {
      "url": "https://api.github.com/mcp",
      "headers": {
        "Authorization": "Bearer ghp_xxxxxxxxxxxx"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
    }
  }
}
```

Only HTTP servers (`url` field) are supported for tool calls. Stdio servers are listed but cannot be called.

### Token storage: `~/.config/mcp-cli/tokens.json`

OAuth tokens stored per server name:

```json
{
  "atlassian": {
    "access_token": "eyJ...",
    "refresh_token": "dGhpcw...",
    "expires_at": 1700000000000,
    "client_id": "mcp-cli-abc",
    "client_secret": "...",
    "token_endpoint": "https://auth.atlassian.com/oauth/token"
  }
}
```

## Authentication

### Priority order

1. `--token <value>` — explicit token on the command line
2. `MCP_<SERVER>_TOKEN` env var — e.g. `MCP_ATLASSIAN_TOKEN`
3. Static `Authorization` header in `~/.cursor/mcp.json`
4. OAuth 2.0 + PKCE — automatic browser-based flow with token caching

### OAuth 2.0 + PKCE flow

1. Discovers OAuth metadata from `/.well-known/oauth-authorization-server`
2. Starts a local HTTP callback server on a random port
3. Registers a dynamic OAuth client (`client_name: "mcp-cli"`)
4. Generates PKCE verifier/challenge (SHA-256, base64url)
5. Opens the browser for user authorization
6. Exchanges the authorization code for tokens
7. Stores tokens at `~/.config/mcp-cli/tokens.json`
8. Auto-refreshes access tokens when within 60 seconds of expiry
9. Falls back to full re-authorization if refresh fails

## Session Management

The tool implements MCP Streamable HTTP transport:

- Sessions initialized with `initialize` (protocol version `2024-11-05`)
- Session IDs from `Mcp-Session-Id` response headers echoed back on subsequent requests
- Sessions and tool lists cached in-memory with a 5-minute TTL
- SSE (Server-Sent Events) responses parsed transparently
- JSON-RPC request IDs auto-incremented

## Error Handling

- **MCP JSON-RPC errors**: Parsed and displayed with field-level hints (e.g. which `--flag` is missing or invalid)
- **Content errors**: When a tool returns `MCP error` text content, the error is parsed and a usage line is printed
- **HTTP errors**: Include status codes and response body snippets
- **`--help` on tools**: Shows usage and required/optional flags before calling
- **Validation errors**: When a tool call fails with schema validation, the usage line is printed above the error

Example error output:

```bash
mcp atlassian getConfluencePage --cloudId <cloudId> --pageId <pageId>

--pageId  required
```

## Output

- JSON results are pretty-printed through `jq -C .` (with ANSI color when output is a TTY)
- Falls back to `JSON.stringify(data, null, 2)` if `jq` is not available
- Respects `NO_COLOR` environment variable to disable color output
- Plain text content is printed as-is

## Files

| File                            | Purpose                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `mcp.ts`                        | Main CLI — arg parsing, auth resolution, server init, tool calls, output formatting, error display             |
| `oauth.ts`                      | OAuth 2.0 + PKCE — discovery, dynamic client registration, code exchange, token refresh, local callback server |
| `bin/mcp.js`                    | Shebang entry that imports `mcp.ts` via `tsx`                                                                  |
| `bin/confluence-sync.js`        | Bulk Confluence space downloader (also registered as `confluence-sync` command)                                |
| `package.json`                  | Package manifest with `mcp` and `confluence-sync` bin entries                                                  |
| `tsconfig.json`                 | TypeScript config — `noEmit`, `esnext`, `nodenext` modules                                                     |
| `AGENTS.md`                     | Agent rules for working with this codebase                                                                     |
| `~/.cursor/mcp.json`            | Server configuration (shared with Cursor IDE)                                                                  |
| `~/.config/mcp-cli/tokens.json` | Cached OAuth tokens                                                                                            |

## confluence-sync

Bulk-downloads all pages from a Confluence space into a local directory tree of Markdown files. Uses `mcp atlassian` under the hood.

```bash
# Get your cloud ID
mcp atlassian getAccessibleAtlassianResources

# List spaces
mcp atlassian getConfluenceSpaces --cloudId <cloudId>

# Sync a space by key
confluence-sync <cloudId> <spaceKey> [outputDir]

# Sync using space ID instead of key
confluence-sync <cloudId> <spaceId> [outputDir] --spaceId
```

Output directory defaults to `./confluence-<spaceKey>`.

Features:
- Recursively fetches all pages and their descendants via `getConfluencePageDescendants`
- Converts page content to Markdown via `contentFormat: "markdown"`
- Adds YAML frontmatter: `id`, `title`, `type`, `status`, `spaceId`, `parentId`, `createdAt`, `version`
- Sanitizes filenames for filesystem safety (replaces `\/:*?"<>|` and whitespace)
- Saves error pages as `.error.txt` files instead of aborting the sync
- Strips ANSI color codes from `mcp` output before parsing
- Cleans Confluence-specific markup: custom emoji, mentions, dates, placeholders, blob images

## TypeScript

- Source files are TypeScript (`.ts`) executed directly via Node with `--import tsx`
- `tsconfig.json`: `target: "esnext"`, `module: "nodenext"`, `noEmit: true`
- `erasableSyntaxOnly: true` — only type annotations that can be erased
- `verbatimModuleSyntax: true` — import/export syntax must match module type
- `rewriteRelativeImportExtensions: true` — `.ts` extensions in imports work at runtime
- Typecheck: `npx tsc --noEmit` from `tools/mcp-cli/`
