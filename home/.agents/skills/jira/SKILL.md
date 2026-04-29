---
name: jira
description: Use this skill when interacting with Jira, Jira urls, Jira Tickets, Jira Keys/Ticket ids
---

# Jira CLI Reference

## Prerequisites

Verify availability:

```bash
jira --help
```

## Security

### Destructive Operations

The following commands are **destructive or irreversible** — always confirm with the user before executing:

- `jira workitem delete` — permanently deletes work items
- `jira project delete` — permanently deletes a project and all its work items
- `jira field delete` — moves custom fields to trash

These commands are **impactful but reversible**:

- `jira workitem archive` / `unarchive`
- `jira project archive` / `restore`
- `jira field cancel-delete` — restores field from trash

**Agent safety rules:**

1. Never run destructive commands without explicit user confirmation, even if `--yes` is available.
2. When bulk-targeting via `--jql` or `--filter`, first run a search with the same query to show the user what will be affected.
3. Prefer `--json` output to verify targets before applying destructive changes.
4. Do not combine `--yes` with destructive bulk operations unless the user explicitly requests unattended execution.

## Command Structure

```
jira <subcommand> [<subcommand> ...] {MANDATORY FLAGS} [OPTIONAL FLAGS]
```

Available command groups:

- `jira workitem` - Work item operations (create, edit, search, assign, transition, comment, clone, link, archive, attachment, watcher)
- `jira project` - Project management
- `jira board` - Board management
- `jira sprint` - Sprint management
- `jira filter` - Saved filter management
- `jira dashboard` - Dashboard management
- `jira field` - Custom field management

## Common Patterns

### Output Formats

Most list/search commands support: `--json`, `--csv`, and default table output.

### Bulk Operations

Target multiple items via:

- `--key "KEY-1,KEY-2,KEY-3"` - comma-separated keys
- `--jql "project = TEAM AND status = 'To Do'"` - JQL query
- `--filter 10001` - saved filter ID
- `--from-file "items.txt"` - file with keys/IDs (comma/whitespace/newline separated)

Use `--ignore-errors` to continue past failures in bulk operations.
Use `--yes` / `-y` to skip confirmation prompts (useful for automation).

### Pagination

- `--limit N` - max items to return (defaults vary: 30-50)
- `--paginate` - fetch all pages automatically (overrides --limit)

### JSON Templates

Many create/edit commands support `--generate-json` to produce a template, and `--from-json` to consume it:

```bash
jira workitem create --generate-json > template.json
# edit template.json
jira workitem create --from-json template.json
```

## Quick Reference: Most Common Operations

### Work Items

```bash
# Create
jira workitem create --summary "Fix login bug" --project "TEAM" --type "Bug"
jira workitem create --summary "New feature" --project "TEAM" --type "Story" --assignee "@me" --label "frontend,p1"

# Search
jira workitem search --jql "project = TEAM AND assignee = currentUser()" --json
jira workitem search --jql "project = TEAM AND status = 'In Progress'" --fields "key,summary,assignee" --csv

# View
jira workitem view KEY-123
jira workitem view KEY-123 --json --fields "*all"

# Edit
jira workitem edit --key "KEY-123" --summary "Updated title" --assignee "user@atlassian.com"

# Transition
jira workitem transition --key "KEY-123" --status "Done"
jira workitem transition --jql "project = TEAM AND sprint in openSprints()" --status "In Progress"

# Assign
jira workitem assign --key "KEY-123" --assignee "@me"

# Comment
jira workitem comment create --key "KEY-123" --body "Work completed"

# Bulk create
jira workitem create-bulk --from-csv issues.csv
```

### Projects

```bash
jira project list --paginate --json
jira project view --key "TEAM" --json
jira project create --from-project "TEAM" --key "NEW" --name "New Project"
```

### Boards & Sprints

```bash
jira board search --project "TEAM"
jira board list-sprints --id 123 --state active
jira sprint list-workitems --sprint 1 --board 6
```
