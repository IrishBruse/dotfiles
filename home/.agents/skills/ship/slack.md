# Ship Slack message

Step 7 of the `ship` skill.

## Format

1-2 lines, plain team-facing prose.
ASCII only, no emojis.

- Line 1: what changed (user-visible outcome, not an implementation log).
- Line 2 (optional): `Ready for review:` plus the PR URL, or put the URL at the end of a single line.

End with the PR URL from `gh pr view --json url`.

## Examples

```
PR that adds metadata audit fields to share enrichment.
https://github.com/org/repo/pull/123
```

```
PR that fixes timezone handling on sprint dates.
https://github.com/org/repo/pull/456
```

Do not include file paths, diff inventory, test checklists, or Jira keys unless the team expects them in Slack.
