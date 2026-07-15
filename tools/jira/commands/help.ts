import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Usage:
  jira <KEY|URL>  Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]  Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]  Push one ticket, or all local tickets when omitted
  jira sync  Same as jira pull
  jira show <KEY|URL> [--fields <list>] [--format text]  Print one issue as JSON (no local file write)
  jira search --jql <query> [--fields <list>] [--format text] [--no-paginate]  Search issues via JQL (JSON stdout)
  jira create --type <T> --summary <text> [--description-file <path>] [--parent <KEY>] [--label <labels>] [--field <name=value>] [--from-draft <path>] [--from-json <path>] [--yes] [--no-pull]  Create a work item (project from CONFIG)
  jira edit <KEY> [--summary <text>] [--description-file <path>] [--labels <list>] [--from-json <path>] [--yes]  Edit summary, description, or labels
  jira transition <KEY> --status <name> [--yes]  Transition status
  jira comment <KEY> (--body-file <path> | --body <text>) [--yes]  Add a comment
  jira link (--from-json <path> | --out <KEY> --in <KEY> --type <name>) [--yes]  Link work items
  jira projects [--format text]  List visible projects (JSON stdout)
  jira types [--format text]  List issue types for CONFIG.project (JSON stdout)
  jira info  Print workspace context (project, sprint cache, local tickets)
  jira board sync  Sync Jira board into ~/.agents/skills/jira-board/
  jira acli <args...>  Alias to acli jira (auth login/logout/switch, deletes, and gated writes blocked)
  jira -h, --help  Print help message

Project is configured statically in tools/jira/lib/CONFIG.ts.
Use jira acli for ad-hoc reads and other projects. Destructive, auth, and write commands that jira already exposes are blocked on jira acli.
`);
}
