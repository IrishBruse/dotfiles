---
name: jira
description: >-
  Investigates a Jira ticket idea, Jira key, initiative, epic, PR, or pasted
  context before any Jira creation. Use when the user asks what a Jira idea
  should become, whether it needs breakdown, whether related tickets already
  exist, or whether to create a Task, Story, Epic, or initiative breakdown.
---

# Jira

Use this as the safe front door for Jira work. `/jira` is a **router**: **legwork** before route selection, **gate** before any Jira write. It answers: **what should this become, what is it related to, and what should happen next?**

It recommends a path, asks the user to choose a route with `AskQuestion`, then reads and follows the matching reference workflow only after the user confirms.

## Pull The Ticket Locally First

Whenever the input includes a Jira key or URL and you will inspect, work on, or update that ticket, your **first step** is to ensure it exists locally under `jira/<type>/`.
If it is not already there, fetch it from Jira and save it as a local markdown file, then work from that file.
This applies to every route, including subcommands and `/jira update`.
After a Jira write, refresh the local file so it matches the live ticket.

## Reference Workflows

Read the matching reference file before continuing from a selected route:

| Route | Reference | Notes |
|------|-----------|-------|
| Task | [`references/task.md`](references/task.md) | Internal Task |
| Sub-task | [`references/task.md`](references/task.md) | Sub-task issue type, required parent |
| Story | [`references/story.md`](references/story.md) | Actor-facing Story |
| Epic | [`references/epic.md`](references/epic.md) | Requires verified Initiative parent |
| Use Cases | [`references/use-cases.md`](references/use-cases.md) | Epic actor/action use cases before Stories |
| Breakdown | [`references/breakdown.md`](references/breakdown.md) | Split, child-ticket plan, or no-split |
| Update | [`references/update.md`](references/update.md) | Hygiene that preserves issue type |
| Clean Up Ticket | [`references/update.md`](references/update.md) | Alias for Update |
| Search More | — | Continue investigation |
| Do Nothing | — | Stop |

### Help And No Usable Input

If the user invokes `/jira`, `/jira help`, or `/jira` without any of the usable inputs listed above, do not gather context and do not use `AskQuestion`. Reply immediately with this concise CLI-style help menu:

```sh
Jira skill

Usage:
  /jira <idea | Jira key | URL | PR | branch | repo | notes>
  /jira <subcommand> <input>
  /jira help

Subcommands:
  story       Draft an actor-facing Story
  task        Draft an internal Task or Sub-task
  epic        Draft a multi-story outcome under an Initiative
  use-cases   Extract actor/action use cases for an Epic
  breakdown   Recommend how to split or clean up an existing issue
  update      Clean up, reformat, or split an issue
  search      Find related Jira, Confluence, GitHub, or local workspace context
  help        Show this menu

Inputs:
  Jira key or URL
  Rough ticket idea, feature name, or search phrase
  Slack conversation or meeting notes
  PR, branch, repo name, or implementation note
  PO or product ask
  Initiative or Epic to break down

Examples:
  /jira NOVACORE-34567 should this be split?
  /jira story payroll admin can review sync failures before retrying
  /jira task add observability for shell bootstrap failures
  /jira breakdown NOVACORE-23456
  /jira update NOVACORE-34567 to match the current story template
```

## Research Depth

Most `/jira` requests should be handled directly by the top-level agent. Start with the smallest useful amount of research, then escalate only when the classification or recommendation would be risky without broader evidence.

### Top-Level Research

Use top-level research for menial, narrow, or clearly task-shaped work. Examples include a small docs task, cleanup task, instrumentation task, one repo setup task, a specific ticket hygiene request, or a ticket idea where the title, scope, parentage, and likely issue type are already clear enough to route.

When using top-level research:

- Read the named Jira ticket when a key is present.
- Check obvious local files, workspace context, or board cache when directly relevant.
- Search for an explicit key, repo, branch, PR, or feature term when it can resolve the route quickly.
- Search local artifacts for related Jira keys, terms, feature names, and similar ticket shapes when a promising local lead appears.
- If the user passes an existing Jira key, search local files for that key and nearby terms so the report can say whether local drafts or specs already exist.
- When the user asks for familiar examples, prefer recent tickets worked by Ethan Conneely or Chris Holmes. Also consider obvious "Chris" variants from Jira results if the exact surname differs.
- Keep the report short and route the user without launching subagents.
- Escalate to deep research before route selection if related tickets, parentage, ownership, repo state, PR state, delivery scope, duplicates, or issue type are uncertain.

### Deep Research

Use deep research for broad, ambiguous, related-work-sensitive, or multi-system inputs. Examples include Stories, Epics, initiative breakdowns, PR-linked work, broad pasted context, vague one-liners, multi-repo work, or anything with meaningful duplicate, parentage, ownership, or delivery-scope risk.

Read and follow [`references/deep-research.md`](references/deep-research.md) for specialist lanes, subagent rules, and the prompt shape.

## `/jira update` Route

Use `/jira update <ticket key or URL> <cleanup request>` when an existing issue needs cleanup, reformatting, splitting, or other hygiene work that preserves the current issue type.

Read and follow [`references/update.md`](references/update.md). Ensure the ticket is pulled locally first (see **Pull The Ticket Locally First**), then identify its current issue type, and compare it to the matching reference workflow from the Reference Workflows table. Return a short recommendation plus the exact proposed Jira change. The update route must never change the issue type; if the type appears wrong, report it as hygiene and route to a separate decision instead of including it in the Jira write.

## Workflow

**Branch:** a subcommand (`story`, `task`, `epic`, `use-cases`, `breakdown`, `update`, `search`) or the `/jira update` route above skips steps 1-7. Read the matching reference workflow and follow its **gates**.

1. **Normalize the input**
   - Extract Jira keys, repo names, PR links, feature names, actors, and likely initiative or epic references.
   - If the request is only a vague one-liner, continue **legwork** before asking questions.
   - Do not ask the user to classify non-trivial work before **Research Depth** lanes have searched obvious local, Jira, Confluence, and GitHub context.
   - **Done when:** normalized input is explicit in working notes (extracted fields listed or "none found" stated).

2. **Gather context**
   - Choose depth per **Research Depth**; deep path per [`references/deep-research.md`](references/deep-research.md).
   - Read workspace context when needed to verify, connect, or expand research findings.
   - **Done when:** every required lane has findings or a logged gap.

3. **Verify Jira context**
   - If a Jira key is present, fetch it and identify issue type, status, parent, children, linked issues, assignee, reporter, Feature Team, labels, and description.
   - For a passed Jira ticket, check whether parent and Feature Team are present. Surface missing values as ticket hygiene in the report (see **Stop Gates**).
   - If only an idea is present, use top-level Jira search for narrow requests and a Jira Search specialist for deep research.
   - For current sprint or board shape, use the available board cache when present, then Jira MCP if live data is needed.
   - **Done when:** ticket fetched, Jira search run, or "no Jira anchor" stated with reason.

4. **Classify the shape**
   - **Existing ticket update**: same outcome already exists and needs description, AC, parent, or status cleanup.
   - **Task**: internal enablement, dependency work, migration, docs, setup, security remediation, or platform plumbing.
   - **Story**: actor-facing behavior with a clear user story and testable outcome.
   - **Epic**: multiple Stories and Tasks under one outcome, parented to a verified Initiative.
   - **Initiative breakdown**: broad Initiative needs several epics, metrics, and value framing before tickets.
   - **Spike**: meaningful unknowns prevent responsible slicing or estimation. Classify only; do not create Spikes unless the user explicitly requests one.
   - **Duplicate / related only**: do not create yet; link or update existing work.
   - **Done when:** each input has exactly one classification, or "uncertain" with the missing signal named.

5. **Assess breakdown need**
   - Recommend breakdown when the work has multiple actors, multiple repos, multiple measurable outcomes, multiple lifecycle phases, or more than one implementation stream.
   - Sizing detail in [`references/breakdown.md`](references/breakdown.md). Prefer 3-8 child tickets for a normal epic. If more than 10 are likely, recommend initiative-to-epic shaping first.
   - Separate actor-facing stories from internal tasks.
   - **Done when:** breakdown yes/no stated with one-line reason. Mark N/A for narrow Task-shaped work.

6. **Surface metrics and value**
   - Capture measurable outcomes before recommending ticket creation.
   - If metrics are missing for an Initiative or Epic, flag them as open questions rather than inventing them.
   - Use progress signals that can be observed without reading implementation code.
   - **Done when:** metrics stated, flagged missing, or marked N/A for Task-shaped work.

7. **Recommend next action**
   - Emit the investigation report, then follow **Required Route Prompt**.
   - **Done when:** report delivered and `AskQuestion` sent.

8. **Continue from the selected route**
   - Follow **Handoff Rules** and the matching reference workflow.
   - **Done when:** the route's first step is complete or the next **gate** is reached.

## Required Route Prompt

After every investigation report, use the `AskQuestion` tool to guide where to go next. This is the main interaction model for the skill. The prompt must reflect the recommendation and only include options that are valid for the current situation.

Use this shape unless the ticket needs a narrower prompt:

```text
Title: <KEY or short idea> - Next step

Prompt:
I found <short status and recommendation>. What would you like to do?
```

Route prompt rules:

- Offer option labels from the Reference Workflows table.
- Include 3-5 options in normal cases.
- Make the recommended path the first option when there is a clear recommendation.
- Include `Search More` when duplicate risk, parentage, ownership, repo state, PR state, or delivery scope is uncertain.
- Include `Do Nothing` unless the user explicitly asked to create or update something and the next gate is already clear.
- When the recommendation depends on missing information, include an option to provide or search for that missing information instead of offering a Jira write as the primary path.
- When a route needs a new Jira ticket title, use `AskQuestion` before finalizing the title. Offer 3-5 recommended title options from the investigation context, put the strongest recommendation first, and include a custom-title option when the wording is not obvious. Do not silently invent the final ticket title.
- If the user selects a route and that route reveals another decision, use `AskQuestion` again with the new, narrower fork.
- Omit empty report sections.

## Handoff Rules

After route confirmation, read the matching Reference Workflow file before continuing.

- Epic route requires a verified Initiative parent before drafting or creating.
- If an Initiative needs multiple epics, present the proposed epic set and stop for confirmation. Do not create epics in the same step.
- If the user selects `Search More`, resume **Workflow** from step 2 for the missing lanes, then step 7.
- If the user selects `Do Nothing`, stop cleanly.

## Jira Write Approval Gate

This gate is the **only** way to perform any remote Jira write in this skill.
A remote Jira write is any create, edit, reparent, transition, close, link, comment, or publish action against Jira (for example `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `createIssueLink`, `addCommentToJiraIssue`, `addWorklogToJiraIssue`).
No route, subcommand, prior message, selected option, or silence may substitute for it.
If this gate has not been answered with its approve option for the exact change shown, do not call any Jira write tool.

Steps, in order:

1. Show the exact proposed change first: the issue key or the new ticket shape, and every field with its before and after value for edits.
2. Call `AskQuestion` immediately before the write, using the fixed shape below and no other options.
3. Perform the write **only** when the user selects `Approve`.
4. If the user selects `Edit first`, revise the proposal and run this gate again.
5. If the user selects `Cancel`, stop and make no Jira write.

Rules:

- One approval covers one described change set. To write several tickets, either list the full set in a single gate or run the gate per write. Never reuse an approval for a different change.
- If the change shown differs in any way from what you are about to write, stop and run the gate again with the corrected proposal.
- Never infer approval from an earlier route choice, a title selection, a prior gate, or the absence of objection. Only the `Approve` option in this gate counts.

Fixed `AskQuestion` shape:

```text
Title: <KEY or new ticket> - Approve Jira write

Prompt:
I will <create | update | reparent | transition | close | link | comment>: <what>.
<exact change summary, before -> after for edits>.
Apply this exact change?

Options:
- Approve - apply this exact change
- Edit first - change something before applying
- Cancel - do not write to Jira
```

## Stop Gates

**Invariant:** Every remote Jira write goes through the **Jira Write Approval Gate** above. Downstream reference workflows inherit this rule.

| Gate | When | Action |
|------|------|--------|
| Missing parent | Recommendation depends on Initiative or Epic parent | Ask for the key or search and confirm candidates |
| Missing ticket parent | A passed Jira ticket has no parent and should be parented before delivery | Surface as Ticket Hygiene and ask whether to search for or assign a parent |
| Missing Feature Team | A passed Jira ticket has no Feature Team | Surface as Ticket Hygiene and recommend setting the appropriate team convention before delivery |
| Metrics unclear | Initiative or Epic has no measurable outcome | Ask for success metrics or propose placeholders clearly marked as questions |
| Duplicate risk | Similar tickets exist | Present candidates and ask whether to update/link instead of create |
| Jira write | Any remote Jira write | Stop and run the **Jira Write Approval Gate**; write only on `Approve` |
| Broad scope | Idea appears larger than one epic | Recommend initiative breakdown and wait for approval |

## Do Not

- Do not hide uncertainty in generic acceptance criteria.
