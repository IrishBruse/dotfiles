---
name: jira-cli
description: Runs the `jira` CLI for local `jira/` markdown and live Jira reads/writes. Use for Jira keys, URLs, JQL search, or pull/push/sync.
---

# Jira CLI

Use the `jira` CLI for all Jira work.

Read existing files under `./jira/` before editing them.

## Start here

```sh
jira info
jira doctor --json
jira sync
```

Read [references/agents.md](references/agents.md) for JSON envelope, batch reads, and doctor checks.

## Local markdown

Tickets live under `./jira/<type>/` as markdown with YAML frontmatter.
Stories nest under their parent epic: `jira/story/<parent title - PROJ-XXXXX>/<story title - PROJ-YYYYY>.md`.

Global `--json` prints `{success, data, error}` on stdout for agent parsing.

## Commands

```sh
jira <KEY|URL>             fetch one ticket (Initiative/Epic: full tree)
jira pull [KEY|URL]        fetch one ticket, or all local tickets when omitted
jira sync                  sync board, sprints, issue types, and agent workspace cache
jira push [KEY]            push one ticket, or all local tickets when omitted
jira show <KEY|URL>        print one issue as JSON (no local file write)
jira search --jql "..."      search issues via JQL (JSON stdout)
jira batch                 run read-only commands from JSON array on stdin (--file, --stop-on-error)
jira doctor                verify acli, auth, CONFIG, and board cache
jira create [flags]          create a work item (--from-draft, --from-json)
jira edit <KEY> [flags]      edit summary, description, or labels
jira transition <KEY>        transition status (--status required)
jira comment <KEY>           add a comment (--body-file or --body)
jira link                    link work items (--out, --in, --type)
jira projects                list visible projects (JSON stdout)
jira types                   list issue types for CONFIG.project (JSON stdout)
jira info                    workspace context (project, cache, local tickets)
jira board sync              deprecated alias for jira sync
jira acli <args...>          passthrough to acli jira STOP and ask for permission to run the command
```

Example batch read:

```sh
echo '[["info"],["search","--jql","project=TEAM AND status=Open"]]' | jira batch --json
```

If the Jira CLI is unavailable, say so and stop for Jira work.
Do not substitute bare `acli`.
