import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Usage:
  jira <KEY|URL>             Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]        Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]        Push one ticket, or all local tickets when omitted
  jira sync                  Same as jira pull
  jira show <KEY|URL>        Print one issue as JSON (no local file write)
  jira search --jql "..."      Search issues via JQL (JSON stdout)
  jira create [flags]          Create a work item (--from-draft, --from-json)
  jira edit <KEY> [flags]      Edit summary, description, or labels
  jira transition <KEY>        Transition status (--status required)
  jira comment <KEY>           Add a comment (--body-file or --body)
  jira link                    Link work items (--out, --in, --type)
  jira projects                List visible projects (JSON stdout)
  jira types <PROJECT>         List issue types for a project (JSON stdout)
  jira board sync              Sync Jira board into ~/.agents/skills/jira-board/
  jira acli <args...>          Passthrough to acli jira (escape hatch)
  jira -h, --help              Print help message
`);
}
