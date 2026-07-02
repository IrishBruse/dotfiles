# Jira Breakdown

Use this route after `/jira breakdown` or `/jira` has confirmed an existing Jira issue should be analyzed for a safer delivery breakdown.

This is an interactive, gated workflow. Work one major step at a time. Refuse a bulk run. If Atlassian MCP is unavailable, say so, reconcile from available local hierarchy context, and note that the source may be stale.

## Purpose

Break any Jira issue into recommended delivery increments and follow-up work. The output may recommend child issues, sibling issues, replacement issues, local drafts, or no split when the existing ticket is already appropriately scoped. Every row is marked `Created`, `Not created`, `Local draft`, `Orphan`, or `Recommendation only` after reconciling related Jira issues via MCP. Open questions belong on the owning backlog row. Do not propose Spikes unless the user explicitly requests them.

Persist the breakdown using workspace artifact conventions.

Optionally draft child files, then create Jira Tasks, Sub-tasks, or Stories only after stop gate 2 approval.

## Pipeline

Use after task context or any Jira issue key is available. Prefer existing local task context when it exists; otherwise fetch the source issue and related Jira issues.

Use before per-child ticket drafting through `story.md` or `task.md`.

Do not treat this as behavioral scenario extraction. This route recommends the best ticket structure and Jira hygiene for the source issue.

## Definitions

### Classification

| Type | Definition |
|------|------------|
| Story | What the user needs: an observable outcome for a designer, engineer, stakeholder, or other actor |
| Task | What the team needs to do: infra, bounded context, schema, wiring, documentation, or other non-user-facing work |
| Spike | Only when the user explicitly asks; otherwise never propose |

### Jira Status

Every backlog row must use one of these values.

| Value | Meaning |
|-------|---------|
| Created | Issue exists in Jira; record key, issue type, workflow status, and parent |
| Not created | Agreed breakdown item with no Jira issue yet |
| Local draft | Local draft exists with `Jira: _(pending)_` |
| Orphan | Issue exists but has the wrong or missing parent; record a hygiene action |
| Recommendation only | Advice for restructuring, reclassifying, linking, or leaving as-is, with no draft yet |

### Open Questions

Discovery questions, TBDs, and unresolved architecture details go on the owning backlog row. Use `-` when none. Do not create a detached discovery section or standalone spike list.

### Metrics Rule

For metrics or platform work, milestones such as kickoff, publish, and handover belong in the ticket that owns the producer flow. Do not create one story per milestone when the same delivery slice owns the flow.

### Breakdown Shape

Choose the shape from the source issue type and scope:

| Source shape | Recommended breakdown |
|--------------|-----------------------|
| Initiative or broad outcome | Recommend candidate Epics first. Do not create them in this route |
| Epic or multi-slice outcome | Recommend Stories and Tasks by increment |
| Story with multiple actor outcomes | Recommend sibling Stories or child Tasks / Sub-tasks, depending on Jira hierarchy rules |
| Task with multiple independent chores | Recommend smaller Tasks, Sub-tasks, or local checklist updates |
| Bug | Recommend reproduction, fix, validation, and follow-up Tasks only when needed |
| Already focused ticket | Recommend no split and list cleanup edits instead |

## Prerequisites

- Source Jira issue key or URL.
- Local task context when present.
- Local hierarchy context.
- Initiative or architecture docs with open-question tables, when referenced.
- Atlassian MCP access to fetch the source issue and related issues. For issue types that can have children, query child relationships and paginate until the result is complete.

## Progress Checklist

```text
- [ ] Steps 1-2: Prerequisites and Jira reconcile
- [ ] Steps 3-7: Classify, increments, recommendations, write breakdown
- [ ] Stop gate 1: Reconcile, increments, classifications, open questions
- [ ] Steps 9-10: Local drafts, optional, and stop gate 2
- [ ] Steps 11-12: Jira create, optional, and post-create
```

## Workflow

1. Prerequisites, read only. Confirm the source issue key. Read task context, Jira hierarchy, and relevant architecture. Stop.
2. Reconcile related Jira issues, read only. Fetch the source issue, children when supported, linked issues, parent, and obvious siblings. For each related issue, capture key, summary, issue type, workflow status, and parent. Cross-check orphans from task context. Match by key first, then summary and intent. Merge duplicates. Never re-propose an existing issue as `Not created`. Source order: MCP, then local hierarchy context, then task-context Jira intelligence. Stop.
3. Classify and map, read only. Decide whether the source should stay as-is, become a parent, split into siblings, receive child Tasks, or be reclassified. Map reconciled issues to the recommended shape, increment, and Jira status. Rows without a Jira key become `Not created` or `Recommendation only`. Stop.
4. Draft increments, read only. Draft 1-7 increments with a progress signal for each and counts for `Created`, `Not created`, and `Recommendation only`. Stop.
5. Complete unified recommendation backlog, read only. Produce one backlog table: `Created` rows by increment, then `Not created` and `Recommendation only` rows. Add `Not created` only where no related issue matches. Put open questions on each owning row. Apply the metrics rule. Stop.
6. Spikes, read only. Only include Spikes if the user explicitly requested them. Otherwise omit. Stop.
7. Write. Save the breakdown using the template below and workspace artifact conventions. Optionally update local indexes, task-context links, or hierarchy pointers. Stop.
8. Stop gate 1. Confirm reconcile results, increments, classifications, and open-question placement. Do not continue to local drafts until explicit confirmation.
9. Optional local drafts. Convert user-selected `Not created` rows into local draft files via `story.md` or `task.md`. Sub-tasks use `task.md` and the same Goal / Acceptance Criteria / Notes format as Tasks. Set `Jira: _(pending)_` and flip the breakdown row to `Local draft`. Stop.
10. Stop gate 2. Ask which `Not created` or `Local draft` items to file in Jira.
11. Optional Jira create. Create only stop gate 2 approved rows. Prefer Tasks and Sub-tasks through `task.md`; create Stories only when the user explicitly requests Story creation. For broader new parent work, route through `epic.md` instead of creating it inside this route. Flip rows to `Created` and record keys. Stop.
12. Post-create. Refresh the breakdown from MCP workflow status. Update local hierarchy context only after Jira creation or confirmed hygiene corrections.

## Reconcile Rules

- Do not list a proposed row if a matching Jira child already exists.
- Refresh `Created` status from MCP, not stale task context alone.
- If a child exists under the wrong or missing parent, mark it `Orphan` and record the hygiene action.
- Do not reparent, close, or replace Jira issues without stop gate approval.

## Plan Mode

- Steps 1-6 are read-only research. Do not emit per-step chat gates when working in plan mode; fold them into one plan gate.
- Fold stop gate 1 into the plan: present reconcile results and backlog design together.
- Step 7 onward is execution. Write breakdown and registry artifacts only after plan approval.
- Stop gate 2 and Jira create remain explicit post-execution gates. Never Jira-create or write local hierarchy context during research.
- Use structured questions for scope clarifications during research, not as a substitute for the plan gate.
- Parallelize independent file reads and independent Jira issue lookups. Serialize shared artifact updates such as hierarchy context and breakdown `Created` flips.
- Step 7 may write the breakdown, indexes, and task-context links in parallel when they are distinct artifacts. Do not parallel-edit hierarchy context or the same backlog table.
- After stop gate 2, create approved Tasks in parallel when safe. Then perform one serialized post-create pass to flip `Created` rows and update local hierarchy context.

## Breakdown Template

```markdown
# Breakdown: <SOURCE-KEY>
Source type: <Initiative|Epic|Story|Task|Bug|Other>
Recommendation: <split|keep as-is|reclassify|create children|create siblings|create parent outcome>
Created: N | Not created: N | Orphan: N | Recommendation only: N

## Increments

| # | Increment | Progress signal |
|---|-----------|-----------------|
| 0 | <increment> | <observable signal> |

## Backlog

| Title | Type | Inc | Jira status | Key | Status | Parent | Depends on | Open questions |
|-------|------|-----|-------------|-----|--------|--------|------------|----------------|
| <title> | Story | 1 | Created | NOVACORE-12345 | <workflow status> | <parent key> | - | - |

<!-- Type: Epic|Story|Task|Bug|Sub-task|Recommendation. Jira status: Created|Not created|Local draft|Orphan|Recommendation only. -->

## Dependency diagram
## Jira hygiene
```

## Draft Child Ticket Rules

- Use `story.md` for Stories.
- Use `task.md` for Tasks and Sub-tasks. Sub-tasks must use the same Task description format (`## Goal`, `## Acceptance Criteria`, optional `## Notes`) and require a parent issue key.
- Save drafts using workspace artifact conventions unless the user explicitly asks for another location.
- Every draft records `Jira: _(pending)_` until creation.
- Parent should follow the recommended breakdown shape and Jira hierarchy rules unless the row is intentionally orphaned or the user chooses another parent.
- Do not create Jira issues during breakdown. Creation happens only after stop gate 2.

## Anti-Patterns

- Marking a row `Not created` when Jira already has a child for the same slice.
- Skipping Jira reconcile.
- Proposing Spike items unless the user explicitly asked for them.
- Keeping a detached discovery section instead of attaching TBDs to owning rows.
- Creating one story per milestone or scenario when the same delivery slice owns the flow.
- Filing work before the user approves the reconcile and backlog design.
- Creating Jira issues without stop gate 2 approval.
- Running multiple gated workflow steps in one turn.
