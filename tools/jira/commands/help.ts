import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Start here (for AI agents):
  jira info                    workspace context + my/unassigned tickets
  jira board                   full board (~/.config/jira/board.json)
  jira doctor --json           verify acli auth and config
  Read the jira-cli skill at ~/.agents/skills/jira-cli/SKILL.md

Core loop:
  jira info
  jira sync                    refresh ~/.config/jira/board.json and ~/.config/jira/info.json
  jira show KEY | jira search "..."
  jira pull KEY                local markdown under jira/
  jira create|edit|...         writes (requires jira skill approval gate)

Global: --json  structured {success, data, error} envelope on stdout

Usage:

Local tickets:
  jira <KEY|URL>  Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]  Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]  Push one ticket, or all local tickets when omitted

Agent workspace:
  jira sync  Sync board to ~/.config/jira/board.json and workspace cache to ~/.config/jira/info.json
  jira board  Print full board from ~/.config/jira/board.json
  jira info  Print workspace context + my/unassigned tickets (plain text)
  jira doctor  Verify acli, auth, config, and board cache
  jira batch [--file <path>] [--stop-on-error]  Run read-only commands from JSON array on stdin

Read:
  jira show <KEY|URL> [--fields <list>]  Print one issue as markdown with frontmatter (no local file write)
  jira search <jql> [--fields <list>] [--format text] [--no-paginate]  Search issues via JQL (JSON stdout)
  jira projects [--format text]  List visible projects (JSON stdout)
  jira types [--format text]  List issue types for configured project (JSON stdout)

Write:
  jira create --type <T> --summary <text> [flags]  Create (auto Feature Team + current sprint; --no-board-defaults; --sprint; --story-points; --field; --from-draft)
  jira edit <KEY> [flags]  Edit summary, description, labels, or --field custom fields (--from-json)
  jira transition <KEY> [<Status>]  List known statuses, or transition (--status alias)
  jira comment <KEY> ["body"]  Add a comment (positional body, or --body / --body-file)
  jira link (--from-json <path> | --out <KEY> --in <KEY> --type <name>)  Link work items

Other:
  jira acli <args...>  Alias to acli jira (auth login/logout/switch, deletes, and gated writes blocked)
  jira -h, --help  Print help message

Use jira acli for ad-hoc reads and other projects. Destructive, auth, and write commands that jira already exposes are blocked on jira acli.
Config: ~/.config/jira/config.json (see tools/jira/jira.config.example.json).
`);
}
