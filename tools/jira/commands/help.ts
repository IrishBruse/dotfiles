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
  jira doctor          Verify acli, auth, config, caches
  jira batch [JSON]    Run read-only commands from JSON

Read:
  jira show KEY|URL    Print markdown and refresh ~/jira when needed
  jira search <jql>    Search issues (JSON). Bare words are rewritten
                       to project + text ~ JQL for the configured project.
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
  jira acli <args...>  Pass through to acli jira (gated)
  jira -h, --help      Print this help
  --json               JSON {success, data, error} on stdout

Flags:
  show --remote              Force live fetch
  show --local               Use the local copy even when stale
  show --fields LIST         Live fetch with selected fields
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
Caches: ~/.config/jira/board.json, info.json
Tickets: ~/jira/<type>/<title> - <KEY>.md
info --json: JiraInfo + board cache (same board as jira board --json)
show: local copy older than 1 day is refetched into ~/jira; stale copy is
      used only when the fetch fails
batch show: { source, key, markdown } (not raw ADF)
`);
}
