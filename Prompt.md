❯ mcp atlassian getConfluencePage
MCP error -32602: Input validation error: Invalid arguments for tool getConfluencePage: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "cloudId"
    ],
    "message": "Required"
  },
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      "pageId"
    ],
    "message": "Required"
  }
]

❯ mcp atlassian getConfluencePage --help
Connecting to atlassian...
Usage

  mcp atlassian getConfluencePage --cloudId <cloudId> --pageId <pageId> [--contentType <contentType>] [--contentFormat <contentFormat>]

  Get a Confluence page or blog post by ID, including body content.

Flags

  --cloudId  string  required
    Cloud ID (UUID or site URL)
  --pageId  string  required
    Page or blog post ID, or a Confluence tiny link ID (the encoded part from /wiki/x/ URLs, e.g., Fc1bBw)
  --contentType  string  optional
    Type of content: page or blog post
    one of: page, blog
  --contentFormat  string  optional
    Content format: "adf" (Atlassian Document Format, JSON) for full fidelity with mentions, panels, and Smart Links, or "markdown" for simplified text. Defaults to ADF when omitted.
    one of: markdown, adf

Improve the error to be be more likea cli app when it has invalid