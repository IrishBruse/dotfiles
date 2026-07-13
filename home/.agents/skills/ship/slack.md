# Ship Slack message

Step 7 of the `ship` skill.

## Format

1-2 lines, plain team-facing prose.
ASCII only, no emojis.

- Line 1: start with a present-tense verb (`Adds`, `Fixes`, `Updates`) describing what the PR does. No `PR that` prefix.
- Line 2 (optional): a related or prerequisite PR, labeled so the reader knows how it connects (e.g. `Builds on:`, `PR for initial setup:`).

End with the PR URL from `gh pr view --json url`.
When referencing a related PR, put its URL on the line that names it.

## Examples

```
Adds local vite server api scaffolding for the prototype panel and adds 2 initial endpoints
https://github.com/gp-nova/repo/pull/13
```

```
Fixes timezone handling on sprint dates
https://github.com/gp-nova/repo/pull/456
```

```
Adds the share enrichment metadata audit fields
https://github.com/gp-nova/repo/pull/124

Builds on:
https://github.com/gp-nova/repo/pull/123
```

Do not include file paths, diff inventory, test checklists, or Jira keys unless the team expects them in Slack.
