---
name: mcp-cli
description: Use this skill when working with the mcp CLI tool.
  Covers calling MCP server tools, listing servers/tools, OAuth auth,
  debugging errors, and the confluence-sync utility.
---

# MCP CLI

CLI wrapper for MCP servers configured in `~/.cursor/mcp.json`. Lets you call tools on remote MCP servers (Atlassian, GitHub, etc.) directly from the terminal without going through an IDE.

## Commands

The tool works by server name — first discover what's available, then call tools on specific servers.

```bash
mcp list                              # List configured MCP servers
mcp <server> tools                    # List tools on a server
mcp <server> <tool> --help            # Show a tool's schema/args
mcp <server> <tool> --key value ...   # Call a tool with flags
mcp <server> auth                     # Re-run OAuth flow
mcp <server> logout                   # Clear stored token
```

## Discovering Servers and Tools

Before calling any tool, check what servers are configured and what tools they expose. Use `--help` to see required and optional arguments for a specific tool.

```bash
mcp list                                         # all servers, transport, auth status
mcp atlassian tools                              # tools on a server
mcp atlassian getConfluencePage --help           # inspect a tool's arguments
```

## Calling Tools

Pass tool arguments as `--key value` flags. Required args are enforced; optional args have defaults. The CLI coerces `"true"`/`"false"` strings to booleans and `null` to null.

```bash
# Required args only
mcp atlassian getConfluencePage --cloudId abc123 --pageId 456

# With optional args
mcp atlassian getPagesInConfluenceSpace --cloudId abc123 --spaceId 789 --limit 50 --contentFormat markdown

# Boolean/null coercion
mcp github search_repositories --query "mcp" --private false
```

## Auth

Most servers require authentication. Tokens are persisted locally so you only auth once. When a call fails with a permission error, check `mcp list` for the server's auth status.

- Tokens stored at `~/.config/mcp-cli/tokens.json` (keyed by server name).
- `mcp <server> auth` forces a fresh OAuth flow.
- `mcp <server> logout` deletes the stored token.

```bash
# Check auth status
mcp list    # look for [oauth] or [token] annotations

# Re-authenticate
mcp atlassian auth
```

## Syncing Confluence Spaces

The `confluence-sync` helper downloads entire Confluence spaces as local Markdown files. It requires a cloud ID, which you get from the Atlassian server first.

```bash
# Get cloud ID
mcp atlassian getAccessibleAtlassianResources

# List spaces
mcp atlassian getConfluenceSpaces --cloudId abc123

# Download everything
confluence-sync abc123 PROD ./docs/prod
```

## Debugging Failed Calls

When a tool call fails, work through these steps in order — most issues are either auth or missing required arguments.

```bash
# 1. Verify server is reachable and auth works
mcp <server> tools

# 2. Check the tool's schema
mcp <server> <tool> --help

# 3. Call with required args, inspect error for missing fields
mcp <server> <tool> --requiredArg value

# 4. Check auth
mcp list    # verify [oauth] or [token] shows up
```
