# `/jira`

Investigation-first Jira assistant for turning rough work into the right next action. It can classify ticket ideas, inspect existing Jira issues, use a subagent to find related Jira, Confluence, GitHub, and local workspace context, draft local ticket files, and route to the correct gated workflow before any Jira write.

`/jira` is the entry point to jira ticket work. It investigates, recommends a path, and asks before creating, updating, reparenting, or closing anything.

## Synopsis

```sh
Jira skill

Usage:
  /jira <prompt>
  /jira <subcommand> <input>
  /jira help

Subcommands:
  story       Draft an actor-facing Story
  task        Draft an internal Task or Sub-task
  epic        Draft a multi-story outcome under an Initiative
  use-cases   Extract actor/action use cases for an Epic
  breakdown   Recommend how to split or clean up an existing issue
  update      Clean up, reformat, or split an issue
  search      Find related Jira, Confluence, GitHub, or local workspace context
  help        Show this menu

Prompt:
  Jira key or URL
  Rough ticket idea, feature name, or search phrase
  Slack conversation or meeting notes
  PR, branch, repo name, or implementation note
  PO or product ask
  Initiative or Epic to break down

Examples:
  /jira NOVACORE-34567 should this be split?
  /jira story payroll admin can review sync failures before retrying
  /jira task add observability for shell bootstrap failures
  /jira breakdown NOVACORE-23456
  /jira update NOVACORE-34567 to match the current story template
```


Use the no-subcommand form with input when you are not sure what route you need. The skill will inspect the input, decide whether it looks like a Task, Story, Epic, use-case extraction, epic breakdown, ticket cleanup, duplicate search, or related-work investigation, then suggest the safest next step.

Use bare `/jira`, `jira`, `/jira help`, or `jira help` to show the command help menu. The help menu lists valid inputs, subcommands, and examples without starting investigation or asking follow-up questions.

If there is not enough usable input, the help menu asks for one of:

- Jira key or URL
- Rough ticket idea, feature name, or search phrase
- Slack conversation or meeting notes
- PR, branch, repo name, or implementation note
- Product ask
- Initiative or Epic to break down

## Subcommands

### `/jira story <idea or context>`

Draft an actor-facing delivery slice through [`references/story.md`](references/story.md).

### `/jira task <idea or context>`

Draft internal work, setup, migration, docs, or plumbing through [`references/task.md`](references/task.md).

### `/jira epic <initiative key> <outcome>`

Draft a multi-story outcome under a verified Initiative through [`references/epic.md`](references/epic.md).

### `/jira use-cases <epic key>`

Agree actor/action use cases before stories or specs through [`references/use-cases.md`](references/use-cases.md).

### `/jira breakdown <ticket key>`

Analyze an existing issue and recommend the right split, child-ticket plan, sibling-ticket plan, or no-split cleanup through [`references/breakdown.md`](references/breakdown.md).

### `/jira update <ticket key> <request>`

Clean up, reformat, or split an existing ticket through [`references/update.md`](references/update.md). The update route preserves the current issue type.

### `/jira search <phrase, repo, PR, branch, or ticket key>`

Use a context research subagent to find related Jira, Confluence, GitHub, and local workspace context, then recommend what to do next using [`SKILL.md`](SKILL.md).

### `/jira help`

Show a CLI-style help menu with usage, subcommands, valid inputs, and examples. Bare `/jira` show the same menu.

## Examples

```sh
/jira
/jira help
/jira payroll admin can review sync failures before retrying
/jira NOVACORE-34567 should this be split?
/jira story payroll admin can review sync failures before retrying
/jira task add observability for shell bootstrap failures
/jira epic NOVACORE-12345 improve user recovery from payroll sync errors
/jira use-cases NOVACORE-23456
/jira breakdown NOVACORE-23456 into the right reviewable tickets
/jira update NOVACORE-34567 to match the current story template
/jira search related PRs and tickets for ui shell permissions
```

## Behavior

- Investigates before recommending a ticket type or workflow.
- Uses a context research subagent to search Jira, Confluence, GitHub, and local context when keys, repos, PRs, or feature names are provided.
- Recommends one or more valid next routes instead of forcing every input into a new ticket.
- Drafts locally before Jira creation when a create route is selected.
- Requires explicit confirmation before any Jira write.

## Good Input

- Jira key or URL
- Rough ticket idea or product ask
- Slack thread, meeting notes, or acceptance criteria
- PR link, branch name, repo name, or implementation note
- Initiative or Epic key for use-case work, or any Jira issue key for breakdown work
