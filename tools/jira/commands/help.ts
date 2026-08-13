import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`jira - Jira tickets and local ~/jira markdown

Usage:
  jira <KEY|URL>
  jira <command> [args]

Local tickets:
  jira <KEY|URL>       Fetch one ticket into ~/jira (cache, not a view)
  jira pull KEY|URL    Fetch or refresh one ticket under ~/jira
  jira pull            Refresh every ticket under ~/jira
  jira push KEY|URL    Push one local ticket
  jira push            Push every ticket under ~/jira

Workspace:
  jira sync            Refresh board.json and info.json
  jira board           Print cached board
  jira info            Context + my/unassigned tickets
                       --json slim fields; add --board for board sections
  jira doctor          Verify acli, auth, config, caches
  jira batch [JSON]    Run read-only commands from JSON

Read:
  jira show KEY|URL    Print markdown and refresh ~/jira when needed
  jira search <jql>    Compact issue list (key/type/status/assignee/summary).
                       Bare words become project + text ~ JQL.
                       Use jira show KEY for full ticket bodies.
  jira projects        List projects (JSON)
  jira types           List issue types (JSON)

  Alias: jira issue KEY  →  jira show KEY

Write:
  jira create          Create an issue
  jira edit KEY        Edit summary, description, labels, fields
  jira transition KEY [S]
                       List statuses, or transition to S
  jira comment KEY [body]
                       Add a comment
  jira link            Link two work items

Other:
  jira -h, --help      Print this help
  --json               JSON {success, data, error} on stdout

Flags:
  show --remote              Force live fetch
  show --local               Use the local copy even when stale
  show --fields LIST         Live fetch with selected fields
  search --limit N           Max issues (default 20)
  search --paginate          Fetch all matching issues
  search --fields LIST       Override list fields (default omits description)
  search --raw               Full acli JSON (large; avoid for agents)
  info --board               Include board sections in info --json
  create --type T --summary TEXT
                             [--parent KEY] [--sprint ID]
                             [--story-points N] [--field id=value]
                             [--from-draft PATH] [--no-board-defaults]
  edit --summary TEXT        [--description-file PATH]
                             [--labels ...] [--field id=value]
  link --out KEY --in KEY --type NAME
  batch '[["info"],["show","KEY"]]'
                             [--file PATH] [--stop-on-error]

Config: ~/.config/jira/config.json
Caches: ~/jira/board.json, ~/.config/jira/info.json
Logs: ~/jira/logs/YYYY-MM-DD.log (command args and errors)
Tickets: ~/jira/<type>/<title> - <KEY>.md
info --json: slim JiraInfo (add --board for board sections)
show: local copy older than 1 day is refetched into ~/jira; stale copy is
      used only when the fetch fails
search: compact hits by default; jira show KEY for description/AC
batch show: { source, key, markdown } (not raw ADF)
batch search: compact { jql, count, limit, issues, hint } unless --raw
batch info: slim like jira info --json (pass --board on the info item)
`);
}
