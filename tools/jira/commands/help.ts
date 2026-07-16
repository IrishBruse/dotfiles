import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Start here (for AI agents):
  jira info                    workspace + board cache context
  jira doctor --json           verify acli auth and config
  Read the jira skill at ~/.agents/skills/jira/SKILL.md

Core loop:
  jira info
  jira sync                    refresh ~/.agents/skills/jira-board/SKILL.md and agent cache
  jira show KEY | jira search --jql "..."
  jira pull KEY                local markdown under jira/
  jira create|edit|... --yes   writes (requires jira skill approval gate)

Global: --json  structured {success, data, error} envelope on stdout

Usage:

Local tickets:
  jira <KEY|URL>  Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]  Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]  Push one ticket, or all local tickets when omitted

Agent workspace:
  jira sync  Sync board summary to ~/.agents/skills/jira-board/SKILL.md and refresh agent cache
  jira info  Print workspace context (project, sprint cache, issue types, local tickets)
  jira doctor  Verify acli, auth, CONFIG, and board cache
  jira batch [--file <path>] [--stop-on-error]  Run read-only commands from JSON array on stdin

Read:
  jira show <KEY|URL> [--fields <list>] [--format text]  Print one issue as JSON (no local file write)
  jira search --jql <query> [--fields <list>] [--format text] [--no-paginate]  Search issues via JQL (JSON stdout)
  jira projects [--format text]  List visible projects (JSON stdout)
  jira types [--format text]  List issue types for CONFIG.project (JSON stdout)

Write:
  jira create --type <T> --summary <text> [flags]  Create a work item (--from-draft, --from-json; project from CONFIG)
  jira edit <KEY> [--summary <text>] [--description-file <path>] [--labels <list>] [--from-json <path>] [--yes]  Edit summary, description, or labels
  jira transition <KEY> --status <name> [--yes]  Transition status
  jira comment <KEY> (--body-file <path> | --body <text>) [--yes]  Add a comment
  jira link (--from-json <path> | --out <KEY> --in <KEY> --type <name>) [--yes]  Link work items

Other:
  jira acli <args...>  Alias to acli jira (auth login/logout/switch, deletes, and gated writes blocked)
  jira -h, --help  Print help message

Project is configured statically in tools/jira/lib/CONFIG.ts.
Use jira acli for ad-hoc reads and other projects. Destructive, auth, and write commands that jira already exposes are blocked on jira acli.
`);
}
