---
name: standup
description: Generate a daily standup report for Slack by pulling yesterday's Git commits (multi-repo via the bundled script), GitHub PR status, Jira board activity (via the jira-tickets skill), and optionally today's Outlook Calendar meetings. Trigger whenever the user says "standup", "daily update", "what did I work on", "generate my standup", "standup report", or anything about summarising yesterday's dev activity for a team. Always use this skill instead of doing it manually.
---

# Standup Report Generator

## Workflow

### 1 — Collect Git & GitHub activity

Run the `scripts/standup-git-daily.ts` script. It scans all repos under `~/git` (depth 3), prints commits from the last 24 h authored by the current git user, and lists related GitHub PRs:

**Parse the output:**

- Each `Repository: <name> (<path>)` block is one repo
- Indented hex lines are commits — capture the full message
- The `Pull requests:` subsection lists `#<n> <title> (<status>)` — status is `open`, `draft`, `merged`, or `closed`
- Categorise commits by conventional-commit prefix: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci` — use these to group the summary
- Extract Jira ticket refs (e.g. `FB-42`, `DEV-7`) from commit messages and PR titles

### 2 — Collect Jira board activity

**Invoke the `jira-tickets` skill** to get:

- Tickets you moved or transitioned in the last day
- Tickets currently "In Progress" assigned to you → these are **today's focus**
- Tickets with a "blocked" label or status, or comments containing "waiting" / "blocked" / "need" → these are **blockers**

### 3 — (Optional) Pull today's calendar meetings

Try to get today's meetings from Outlook on macOS. Prefer whichever method works:

```bash
# Option A – icalBuddy (install: brew install ical-buddy)
icalBuddy -includeEventProps "title,datetime" -ic "Outlook" eventsToday

# Option B – macOS Shortcuts shortcut named "Today's Meetings" if the user has set one up
shortcuts run "Today's Meetings"
```

If neither works, skip silently — don't error out or ask the user to fix it now.

### 4 — Compose the Slack message

Use the format below. Keep it tight — Slack standups should be skimmable in 30 seconds.

```
 *Standup – <Day, Month Date>*

* Yesterday*
<repo or ticket grouping>
• <commit/ticket summary line>   ← one bullet per meaningful unit of work; merge trivial commits
• ...

* PRs*
• #<n> <title> — <merged|open|reviewed>
• ...

* Today*
• <FB-XX>: <ticket title> _(In Progress)_
• <FB-YY>: <ticket title>
• ...

* Meetings*   ← omit section if no meetings found
• <HH:MM> <meeting title>
• ...

* Blockers*   ← omit section if none
• <FB-XX>: <brief description of blocker>
```

**Formatting rules:**

- Use Slack `*bold*` and `_italic_`, not Markdown `**` or `__`
- Merge noisy commits (e.g. three `Fix` commits on the same ticket → one bullet)
- If no blockers exist, drop that section entirely — don't write "None"
- If no PRs, drop that section
- Keep the whole message under ~30 lines so it doesn't need a "See more" expand in Slack

### 5 — Present the output

Print the final Slack message in a code block so it's easy to copy. Then offer:

> "Want me to send this to Slack, or is there anything to tweak first?"

Do not send to Slack without explicit confirmation.

---

## Example output

```
*Standup – Monday, 19 May*

* Yesterday*
markdown-inline-editor-vscode
• Made default behaviour configurable, initial commit (2 commits)

project-proximity
• Renamed core module, fixed input handling, docs update (5 commits)

* PRs*
• #89 feat(links): optional chain icon after hyperlinks — open

* Today*
• FB-50: Booking confirmation emails _(In Progress)_
• FB-52: Email template design

* Meetings*
• 10:00 Sprint planning
• 14:30 1:1 with manager

* Blockers*
• FB-50: Waiting for email service credentials from DevOps
```

---

## Troubleshooting

| Problem                    | Fix                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Script not found           | Check `$HOME/.agents/skills/standup/scripts/standup-git-daily.ts` exists            |
| No commits shown           | Confirm `git config user.name` matches commit author; check repos are under `~/git` |
| `gh` not authenticated     | Run `gh auth login`; PR section will be skipped until then                          |
| `icalBuddy` missing        | `brew install ical-buddy`; skip calendar section for now                            |
| jira-tickets skill missing | Mention it in the report and skip Jira section                                      |
