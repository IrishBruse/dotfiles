---
name: failure
description: Logs agent mistakes, blockers, and wrong assumptions to incident files. Use when an agent hits a repeatable failure, makes a wrong assumption, wastes time on a dead end, or when the user asks to record or review incidents.
---

# Failure incident log

Track issues agents run into so future sessions can avoid the same mistakes.

## When to log

Log an incident when:

- A command or approach failed and the fix was non-obvious
- The agent assumed the wrong API, path, or workflow
- The same mistake could happen again in this repo or toolchain
- The user asks to record what went wrong

Do not log routine typos or one-off user preference changes.

## Where entries go

The `failure` CLI routes by repo:

| cwd | log file |
| --- | --- |
| under `~/git/<name>/` | `~/.agents/skills/failure/references/<name>.md` |
| anywhere else | `~/.agents/skills/failure/references/misc.md` |

Entries are always appended to the end of the file.

## Log an incident

```bash
failure log "<short title>" --detail "<what happened>" --resolution "<fix or workaround>"
```

`--detail` and `--resolution` are optional. Extra arguments after the title are appended to the detail body. Piped stdin is also appended to detail.

Use `--cwd <path>` when the incident belongs to a repo other than the shell cwd.

## Before similar work

1. Identify the repo (`~/git/<name>/` or misc).
2. Read `~/.agents/skills/failure/references/<name>.md` or `misc.md` if it exists.
3. Skim recent `##` headings for related failures.

## Entry format

Each append looks like:

```markdown
## 2026-06-11T19:30:00Z - Short title

- **cwd:** `/path/at/time`
- **repo:** GRun

What went wrong...

**Resolution:**

How it was fixed...

---
```
