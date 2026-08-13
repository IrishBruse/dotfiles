# Search and JQL

Default `jira search` is discovery-only: compact hits, limit 20, no description ADF.
Use `jira show KEY` for ticket bodies.

## Flags

```bash
jira search "..."                 # compact list, limit 20
jira search "..." --limit 5       # tighter bound
jira search "..." --paginate      # all matches (use sparingly)
jira search "..." --fields LIST   # override fields (default omits description)
jira search "..." --raw           # full acli JSON (large; avoid for agents)
jira search "..." --json          # compact envelope as JSON
```

## Output shape

Human:

```text
KEY	type	status	assignee	summary
N issue(s). Use jira show KEY for full ticket markdown.
```

JSON (`--json`):

```json
{
  "jql": "...",
  "count": 1,
  "limit": 20,
  "issues": [
    {
      "key": "NOVACORE-1",
      "summary": "...",
      "type": "Bug",
      "status": "To Do",
      "assignee": "Ada"
    }
  ],
  "hint": "Use jira show KEY for full ticket markdown"
}
```

## Free text

Bare words are rewritten to project-scoped text search:

```sh
jira search "design governance"
# -> project = <config> AND text ~ "\"design governance\""
```

## Useful JQL

```sh
# Open sprint for configured Feature Team (name from jira info)
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors'

# Children of a parent
jira search 'parent = NOVACORE-12345'

# Recent team tickets
jira search 'project = NOVACORE AND sprint in openSprints() AND "Feature Team" = dynaFormRaptors ORDER BY updated DESC' --limit 10

# Phrase match
jira search 'project = NOVACORE AND summary ~ "\"white label\""'
jira search 'project = NOVACORE AND text ~ "\"module-load error\""'
```

For a known key, skip search: `jira show KEY`.
