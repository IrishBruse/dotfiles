# Writes

Every remote Jira write requires an `Approve` answer for the exact change.
The CLI does not enforce the gate. Do not also read the `jira` skill for that gate when this skill is already loaded. If you need `/jira` routing or the full write-approval UX, read `jira` **instead of** this skill.

One Approve covers one described change set.

## Local-first (summary / description)

1. `jira show KEY` so `~/jira` is current
2. Edit `title` in frontmatter and the markdown body
3. After gate Approve: `jira push KEY`

`jira push` syncs **summary** and **description** only.
After push, the local file is refreshed from Jira.

## Create

After gate Approve:

```sh
jira info   # featureTeamOptionId, sprintId, storyPointsField, project

# Prefer draft promote
jira create --from-draft ~/jira/story/...md

# Typical Task/Story
jira create --type Task --summary "..." --parent KEY --story-points 1 --sprint 27857

# Explicit field overrides
jira create --type Story --summary "..." --parent KEY \
  --field customfield_10354=16409 \
  --field customfield_10021=27857 \
  --field customfield_10023=1
```

Defaults:

- Feature Team from `jira info` is applied when the option id is known
- Sprint is not inferred from the board. Pass `--sprint <id>` when needed
- `--story-points <n>` sets story points when provided
- `--field id=value` always wins over defaults
- NOVACORE Epic creates get Capitalizable=Yes when unset
- `--from-json` skips defaults. `--from-draft` still applies defaults

## Edit non-markdown fields

Prefer local-first for summary/description.
Use `jira edit` only for fields `jira push` cannot sync:

```sh
jira edit KEY --field customfield_10023=2
jira edit KEY --labels a,b --field customfield_10354=16409
```

If acli rejects custom fields on edit, use Atlassian MCP `editJiraIssue` with field ids from `jira info`, then `jira pull KEY`.

## Transition, comment, link

```sh
# List current status + known board statuses (no write)
jira transition KEY

jira transition KEY Cancelled
jira comment KEY "Cancellation reason..."
jira link --out KEY --in KEY --type Relates
```

After CLI writes that are not `push`, refresh with `jira pull KEY`.
