import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Usage:

Local tickets:
  jira <KEY|URL>       Fetch one ticket into jira/ (Initiative/Epic: full tree)
  jira pull KEY|URL    Fetch/refresh that one ticket into jira/
  jira pull            Refresh every ticket already under jira/ (no new keys)
  jira push KEY|URL    Push that one local ticket's summary+description to Jira
  jira push            Push every local ticket under jira/

Workspace:
  jira sync  Sync board to ~/.config/jira/board.json and workspace cache to ~/.config/jira/info.json
  jira board  Print full board from ~/.config/jira/board.json (includes age in stage)
  jira info  Print workspace context + my/unassigned tickets (plain text)
  jira doctor  Verify acli, auth, config, and board cache
  jira batch [--file <path>] [--stop-on-error]  Run read-only commands from JSON array on stdin

Read:
  jira show <KEY|URL> [--fields <list>] [--remote]  Print local jira/ copy when present, else live issue
  jira search <jql> [--fields <list>] [--format text] [--no-paginate]  Search issues via JQL (JSON stdout)
  jira projects [--format text]  List visible projects (JSON stdout)
  jira types [--format text]  List issue types for configured project (JSON stdout)

Write:
  jira create --type <T> --summary <text> [flags]  Create (auto Feature Team; --sprint; --story-points; --field; --from-draft)
  jira edit <KEY> [flags]  Edit summary, description, labels, or --field custom fields (--from-json)
  jira transition <KEY> [<Status>]  List known statuses, or transition (--status alias)
  jira comment <KEY> ["body"]  Add a comment (positional body, or --body / --body-file)
  jira link (--from-json <path> | --out <KEY> --in <KEY> --type <name>)  Link work items

Other:
  jira acli <args...>  Alias to acli jira (auth login/logout/switch, deletes, and gated writes blocked)
  jira -h, --help  Print help message
  --json  Structured {success, data, error} envelope on stdout

`);
}
