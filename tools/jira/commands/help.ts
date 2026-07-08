import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Usage:
  jira <KEY|URL>             Fetch a ticket into jira/ (Initiative/Epic: full tree)
  jira pull [KEY|URL]        Fetch one ticket, or all local tickets when omitted
  jira push [KEY|URL]        Push one ticket, or all local tickets when omitted
  jira sync                  Same as jira pull
  jira board sync            Sync Jira board into ~/.agents/skills/jira-board/
  jira -h, --help            Print help message
`);
}
