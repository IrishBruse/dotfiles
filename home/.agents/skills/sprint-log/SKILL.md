---
name: sprint-log
description: >-
  Capture work done in the current Jira sprint into a dated markdown file.
  Pulls Jira (acli), git commits under ~/git, GitHub PRs (gh), and Outlook meetings
  when ical-buddy is installed. Replaces the old standup skill. Trigger on
  "sprint log", "weekly log", "what did I work on this sprint", "capture my sprint",
  or end-of-sprint recap.
---

# Sprint log

Record GP sprint work as markdown under `~/notes/sprint-log/<YYYY-MM-DD>.md` (today's date). Scope is the **active sprint** on Jira board `691` (dynaForm Raptors).

## Workflow

### 1 — Collect raw data

```bash
scripts/sprint-log-collect.ts
```

The script prints the output path. Optional flags:

- `--out PATH` — override file location
- `--board-id ID` — default `691`

Requires: `acli` (Jira), `git` with `user.name` set, repos under `~/git` (or `SPRINT_LOG_GIT_ROOT`). `gh` for PR sections (empty if not logged in).

### 2 — Refresh Jira context (optional)

If the board snapshot is stale, run `jira sync` first (atlassian tool). The collector uses live Jira JQL, not the jira-tickets skill files.

### 3 — Write the Summary

Read the generated file. Replace the `## Summary` placeholder with 3-6 bullets grouped by theme (tickets, repos, PRs). Merge noisy git lines (many small commits on one ticket -> one bullet). Mention blockers only if visible in Jira status or open PRs.

Do not invent work not present in the file.

### 4 — Meetings and Slack

- **Meetings:** filled automatically when `ical-buddy` is installed (`brew install ical-buddy`) and Outlook is the calendar source. Otherwise leave the hint or paste from Outlook.
- **Slack:** no API integration. Add highlights under `## Notes` from what the user provides.

### 5 — Present result

Tell the user the file path and offer to append Notes or tweak Summary. Do not post to Slack unless asked.

## Output shape

The file includes frontmatter (`sprint`, `sprintId`, `periodStart`, `periodEnd`, `generated`) and sections: Sprint, Summary, Jira (done / active by status), Git commits by repo, Pull requests (merged / open), Meetings, Notes.

Re-running on the same day overwrites that day's file. Use `--out` for a variant name if keeping drafts.

## Troubleshooting

| Problem          | Fix                                                                  |
| ---------------- | -------------------------------------------------------------------- |
| No active sprint | Confirm board 691 has an active sprint in Jira                       |
| Empty git        | Check `~/git` paths and `git config user.name` matches commit author |
| Empty PRs        | `gh auth login`                                                      |
| acli errors      | `acli jira auth`                                                     |
| Wrong board      | `--board-id` or edit `BOARD_ID` in the script                        |
