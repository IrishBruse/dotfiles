---
name: sprint-report
description: Sprint report
disable-model-invocation: true
---

Weekly Sprint Summary
This skill was generated using AI, which can produce inaccurate or harmful responses. Review for accuracy and safety before using.

How It Works

ALWAYS (standalone): Searches broadly across all Slack channels, threads, DMs, and files for the user's activity in the current sprint window. Produces a rich, structured summary canvas with contribution types, impact levels, linked artefacts, and a sprint narrative - without requiring any external integrations.
CONNECTED (with integrations): If Jira, GitHub, or calendar are available, enriches the summary with ticket transitions, PR activity, and meeting context to give a fuller picture of the sprint.

Steps

Phase 1: Determine Sprint Window

- The sprint is 2 weeks long, starting on a Thursday and ending on a Wednesday.
- Calculate the sprint start date as the Thursday 13 days before the upcoming or most recent Wednesday end date.
- If the user provides a specific sprint (e.g. "Sprint 149") or end date, use that. Otherwise, calculate the most recently completed or in-progress sprint window relative to today.
- Confirm the date range before searching (e.g., "Searching your activity from Thu 14 May – Wed 27 May").

Phase 2: Gather Slack Activity
Search broadly across all Slack content for the user's contributions during the sprint window. Run multiple searches with varied queries - by channel, project name, team name, and G-P product keywords - to ensure thorough coverage:

- Messages sent by the user in any channel (including team and project channels)
- Threads the user participated in, started, or was mentioned in
- DMs where the user contributed meaningfully
- Files, canvases, or documents the user shared or created
- Reactions the user gave that drove or acknowledged decisions (e.g. :white_check_mark:, :eyes:, :+1:)
- Scrum ceremony participation: standups, retros, sprint planning, demos
- Mentions of the user's name by others - these can surface impact and unblocking moments the user may not have messaged about directly

If a search returns limited results, retry with alternative queries (e.g. by different channel, topic, or keyword) until all likely workstreams are covered.
Phase 3: Enrich with Integrations (if available)

- Jira: Search for tickets the user commented on, transitioned, or closed during the sprint. Note the ticket title, status change, and any comments left. Flag tickets that moved to Done, In Review, or were blocked.
- GitHub: Look for PRs opened, reviewed, or merged. Note the PR title, repo, and review activity. Flag significant merges or review cycles.
- Calendar: Pull meetings the user attended, led, or contributed to. Flag recurring ceremonies (standups, retros, planning), 1:1s, and cross-team syncs the user was active in.
- If none of these are available, skip this phase gracefully and note it in the output.

Phase 4: Analyse & Synthesise
Group the gathered activity into meaningful themes or workstreams. For each theme:

- Summarise what was worked on, why it mattered, and what impact it had
- Note key decisions made, blockers raised or resolved, and outcomes achieved
- Identify who the user collaborated with, including cross-team partners
- Flag anything that carried over or remained unresolved at sprint end
- Classify the contribution type for each workstream:
  - Execution - directly building, writing, or shipping work
  - Review/Feedback - code review, doc review, design critique
  - Coordination - unblocking others, scheduling, aligning stakeholders
  - Decision-making - driving or making a key call
  - On-call/Incident - responding to production issues or alerts
- Assign an impact level per workstream: High / Medium / Low
- Identify a notable moment per workstream - a specific message, thread, or outcome worth highlighting

Look for patterns across the sprint: Was the user primarily in execution mode? Unblocking others? Context-switching heavily? Highlight the nature of contributions, not just the volume.
Phase 5: Produce Output
Write a detailed sprint summary canvas using the structure below. Be specific - include real names, channel names, Jira ticket IDs, PR links, and outcomes where available. Avoid vague or generic summaries. Every section should feel like it could only have been written about this sprint.

Output

```md
# Sprint Summary - [Start Date] to [End Date]

## Sprint Narrative

[4–5 sentence paragraph telling the story of the sprint. What were the biggest themes? What did the user spend most energy on? What shifted or surprised? What was the overall impact? Write this as a human summary, not a bullet list.]

## Workstreams & Contributions

### [Theme / Project Name]

- **Contribution type:** [Execution / Review / Coordination / Decision-making / On-call]
- **Impact:** [High / Medium / Low]
- **What I did:** [Specific actions - messages sent, decisions driven, code reviewed, docs written, tickets transitioned, etc.]
- **Outcome:** [What resulted - resolved, shipped, unblocked, escalated, merged, closed, etc.]
- **Collaborators:** [Names of people worked with]
- **Channels/Threads:** [Where this happened]
- **Linked artefacts:** [Jira tickets, PR links, canvas links, doc links - if available]
- **Notable moment:** [A specific message, decision, or outcome that captures the essence of this workstream]

[Repeat for each theme]

## Key Decisions & Outcomes

- [Decision or outcome 1 - what was decided, what the user contributed, and what happened as a result]
- [Decision or outcome 2]
- ...

## Blockers Raised or Resolved

- [Blocker 1 - what it was, how it was raised, and how it was handled or escalated]
- [Blocker 2]
- ...

## Recognition & Shoutouts

[Moments where the user unblocked, helped, or had a visible positive impact on teammates. Include specific names and what the interaction produced. If no clear examples were found, omit this section.]

## Collaborations & Cross-team Work

[Summary of who the user worked with outside their immediate team, which channels those interactions happened in, and what they produced.]

## Carry-overs & Open Items

- [Item still in progress or unresolved at sprint end - include context on why it carried over]
- ...

## Stats & Signals

- Channels active in: [N]
- Threads participated in: [N]
- Files/docs shared: [N]
- Contribution mix: [e.g. "60% execution, 25% coordination, 15% review"]
- Key integrations surfaced: [Jira tickets closed: N | PRs merged: N | Meetings led: N - if available]
```

Key Principles

- Be specific and concrete - use real names, dates, channel references, ticket IDs, and outcomes. Vague summaries defeat the purpose of this skill.
- Prioritise quality over quantity - a few well-described contributions are more valuable than a long list of minor activities.
- Represent the user's impact accurately - don't undersell deep execution work, quiet unblocking, or review contributions that others depended on.
- Classify contributions honestly - if most of the sprint was coordination or on-call, say so. Don't inflate execution work.
- The Sprint Narrative should read like a human wrote it, not like a bullet list in disguise. It should tell a story.
- If data is sparse, say so honestly and suggest the user point to specific channels or threads to enrich the summary.
- Always anchor the sprint window correctly - sprints run Thursday to Wednesday over 2 weeks (e.g. Thu 14 May – Wed 27 May).
