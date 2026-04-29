---
name: jira
description: Use this skill when interacting with Jira, acli Jira urls, acli Jira Tickets, acli Jira Keys/Ticket ids
---

# acli Jira CLI Reference

## Prerequisites

Verify availability:

```bash
acli jira --help
```

## File sync

If you are interacting with a tickets description make sure to persist it in `~/dotfiles/.agents/skills/jira-tickets/`

## Command Structure

```
acli jira <subcommand> [<subcommand> ...] {MANDATORY FLAGS} [OPTIONAL FLAGS]
```

Available command groups:

- `acli jira workitem` - Work item operations (create, edit, search, assign, transition, comment, clone, link, archive, attachment, watcher)
- `acli jira project` - Project management
- `acli jira board` - Board management
- `acli jira sprint` - Sprint managementThis webview is used internally by the Markdown Inline Editor extension to render Mermaid diagrams inline in your markdown files.

- `acli jira filter` - Saved filter management
- `acli jira dashboard` - Dashboard management
- `acli jira field` - Custom field management

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
acli jira workitem create --generate-json > template.json
# edit template.json
acli jira workitem create --from-json template.json
```

## Quick Reference: Most Common Operations

### Work Items

```bash
# Create
acli jira workitem create --summary "Fix login bug" --project "TEAM" --type "Bug"
acli jira workitem create --summary "New feature" --project "TEAM" --type "Story" --assignee "@me" --label "frontend,p1"

# Search
acli jira workitem search --jql "project = TEAM AND assignee = currentUser()" --json
acli jira workitem search --jql "project = TEAM AND status = 'In Progress'" --fields "key,summary,assignee" --csv

# View
acli jira workitem view KEY-123
acli jira workitem view KEY-123 --json --fields "*all"

# Edit
acli jira workitem edit --key "KEY-123" --summary "Updated title" --assignee "user@atlassian.com"

# Transition
acli jira workitem transition --key "KEY-123" --status "Done"
acli jira workitem transition --jql "project = TEAM AND sprint in openSprints()" --status "In Progress"

# Assign
acli jira workitem assign --key "KEY-123" --assignee "@me"

# Comment
acli jira workitem comment create --key "KEY-123" --body "Work completed"

# Bulk create
acli jira workitem create-bulk --from-csv issues.csv
```

### Projects

```bash
acli jira project list --paginate --json
acli jira project view --key "TEAM" --json
acli jira project create --from-project "TEAM" --key "NEW" --name "New Project"
```

### Boards & Sprints

```bash
acli jira board search --project "TEAM"
acli jira board list-sprints --id 123 --state active
acli jira sprint list-workitems --sprint 1 --board 6
```

## Security

### Destructive Operations

The following commands are **destructive or irreversible** — always confirm with the user before executing:

- `acli jira workitem delete` — permanently deletes work items
- `acli jira project delete` — permanently deletes a project and all its work items
- `acli jira field delete` — moves custom fields to trash

These commands are **impactful but reversible**:

- `acli jira workitem archive` / `unarchive`
- `acli jira project archive` / `restore`
- `acli jira field cancel-delete` — restores field from trash

**Agent safety rules:**

1. Never run destructive commands without explicit user confirmation, even if `--yes` is available.
2. When bulk-targeting via `--jql` or `--filter`, first run a search with the same query to show the user what will be affected.
3. Prefer `--json` output to verify targets before applying destructive changes.
4. Do not combine `--yes` with destructive bulk operations.
