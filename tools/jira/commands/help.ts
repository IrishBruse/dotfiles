import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Start here (for AI agents):
  jira info                    raw MCP/CLI context (cloudId, project, fields)
  jira board                   my tickets and unassigned (~/.config/jira/board.json)
  jira doctor --json           verify acli auth and config
  Read the jira-cli skill at ~/.agents/skills/jira-cli/SKILL.md

Core loop:
  jira info
  jira sync                    refresh ~/.config/jira/board.json and ~/.config/jira/info.json
  jira show KEY | jira search "..."
  jira pull KEY                local markdown under jira/
  jira create|edit|... --yes   writes (requires jira skill approval gate)

Global: --json  structured {success, data, error} envelope on stdout

Usage:

Local tickets:
  jira <KEY|URL>  Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]  Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]  Push one ticket, or all local tickets when omitted

Agent workspace:
  jira sync  Sync board to ~/.config/jira/board.json and workspace cache to ~/.config/jira/info.json
  jira board  Print my tickets and unassigned from ~/.config/jira/board.json
  jira board --full  Include teammates and misc sections
  jira info  Print raw agent context for MCP/CLI (cloudId, fields)
  jira doctor  Verify acli, auth, config, and board cache
  jira batch [--file <path>] [--stop-on-error]  Run read-only commands from JSON array on stdin

Read:
  jira show <KEY|URL> [--fields <list>]  Print one issue as markdown with frontmatter (no local file write)
  jira search <jql> [--fields <list>] [--format text] [--no-paginate]  Search issues via JQL (JSON stdout)
  jira projects [--format text]  List visible projects (JSON stdout)
  jira types [--format text]  List issue types for configured project (JSON stdout)

Write:
  jira create --type <T> --summary <text> [flags]  Create (auto Feature Team from info; --board-defaults; --sprint; --story-points; --field; --from-draft)
  jira edit <KEY> [flags] [--yes]  Edit summary, description, labels, or --field custom fields (--from-json)
  jira transition <KEY> --status <name> [--yes]  Transition status
  jira comment <KEY> (--body-file <path> | --body <text>) [--yes]  Add a comment
  jira link (--from-json <path> | --out <KEY> --in <KEY> --type <name>) [--yes]  Link work items

Other:
  jira acli <args...>  Alias to acli jira (auth login/logout/switch, deletes, and gated writes blocked)
  jira -h, --help  Print help message

Use jira acli for ad-hoc reads and other projects. Destructive, auth, and write commands that jira already exposes are blocked on jira acli.
Config: ~/.config/jira/config.json (see tools/jira/jira.config.example.json).
`);
}
