---
name: jira
description: >
  Create Jira tickets. Use when the user asks what a Jira idea should become, whether
  it needs breakdown, whether related tickets already exist, or whether to
  create a Task, Story, Epic, Spike, or initiative breakdown. Routes Jira
  creation, use-case extraction, and epic breakdown through the reference
  workflows in this skill.
---

# Jira

Use this as the safe front door for Jira work. It answers: **what should this become, what is it related to, and what should happen next?**

This skill does **not** create or update Jira issues during the investigation step. It recommends a path, asks the user to choose a route, then reads and follows the matching reference workflow only after the user confirms.

## Reference Workflows

Read the matching reference file before continuing from a selected route:

| Route | Reference |
|------|-----------|
| Task | [`references/task.md`](references/task.md) |
| Sub-task | [`references/task.md`](references/task.md) |
| Story | [`references/story.md`](references/story.md) |
| Epic | [`references/epic.md`](references/epic.md) |
| Use Cases | [`references/use-cases.md`](references/use-cases.md) |
| Breakdown | [`references/breakdown.md`](references/breakdown.md) |
| Update | [`references/update.md`](references/update.md) |

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
```

## Workflow Contract

`/jira` is an **investigation-first router**. The default experience is:

1. The user gives a Jira key, ticket idea, PR, branch, or pasted context.
2. The agent gathers enough context to classify the input. Use quick top-level research for menial, narrow, or clearly task-shaped requests. Use parallel specialist research subagents only when the input needs deep research across Jira, Confluence, GitHub, or local workspace context.
3. The agent returns a concise investigation report.
4. The agent immediately uses `AskQuestion` to offer valid next routes.
5. The agent reads the selected reference workflow before drafting, writing, publishing, reparenting, or closing anything.
6. The agent does not create, update, publish, reparent, or close until the user selects a route and the relevant stop gate is satisfied.

This route-selection prompt is a required part of the skill, not a nice-to-have. Prefer a useful report plus 3-5 concrete options over asking an open-ended "what next?" question.

## Research Depth

Most `/jira` requests should be handled directly by the top-level agent. Start with the smallest useful amount of research, then escalate only when the classification or recommendation would be risky without broader evidence.

### Top-Level Research

Use top-level research for menial, narrow, or clearly task-shaped work. Examples include a small docs task, cleanup task, instrumentation task, one repo setup task, a specific ticket hygiene request, or a ticket idea where the title, scope, parentage, and likely issue type are already clear enough to route.

When using top-level research:

- Read the named Jira ticket when a key is present.
- Check obvious local files, workspace context, or board cache when directly relevant.
- Search for an explicit key, repo, branch, PR, or feature term when it can resolve the route quickly.
- Keep the report short and route the user without launching subagents.
- Escalate to deep research before route selection if related tickets, parentage, ownership, repo state, PR state, delivery scope, duplicates, or issue type are uncertain.

### Deep Research

Use deep research for broad, ambiguous, related-work-sensitive, or multi-system inputs. Examples include Stories, Epics, initiative breakdowns, PR-linked work, broad pasted context, vague one-liners, multi-repo work, or anything with meaningful duplicate, parentage, ownership, or delivery-scope risk.

When deep research is needed, launch multiple `generalPurpose` subagents in parallel and give each subagent one research lane. Use only the lanes that match the input and the risk:

- **Jira Search**: search Jira issues for related work, duplicates, parent Initiative or Epic candidates, issue type precedents, ownership, Feature Team, labels, and ticket hygiene signals.
- **Confluence Search**: search Confluence for decisions, plans, requirements, RFCs, architecture pages, meeting notes, and product context that shape the ticket.
- **GitHub Search**: search GitHub with `gh` for related PRs, branches, repos, issues, implementation clues, ownership signals, and recent similar changes when a repo, PR, branch, or implementation clue is present.
- **Local Workspace Search**: search local workspace artifacts for related drafts, specs, context files, previous agent output, and cloned repo evidence when local files are likely to contain relevant context.

Each specialist subagent must:

- Receive the normalized user input plus relevant Jira keys, repo names, PR links, branch names, feature names, actors, suspected parent Initiative or Epic, and the specific research lane.
- Return concise findings only for its lane.
- Include source references with keys, titles, URLs, file paths, or commands used where available.
- Report confidence, duplicate or parentage risks, ticket hygiene findings, and open questions relevant to its lane.
- Avoid creating, updating, publishing, reparenting, closing, commenting on, or otherwise mutating Jira, Confluence, GitHub, or local files.

Use the specialist findings as evidence for the investigation report. If a lane is blocked by credentials or access, continue with available context and surface the gap in the report.

### Deep Research Prompt Shape

Use this shape for each lane:

```text
Research lane: <Jira Search | Confluence Search | GitHub Search | Local Workspace Search>

Input:
<normalized user input, keys, repos, PRs, branches, feature names, actors, parent candidates>

Task:
Search only this lane for context that affects Jira routing, duplicate risk, parentage, ownership, issue type, breakdown need, and ticket hygiene.

Return:
- Findings
- Source references
- Risks or duplicates
- Parentage or ownership signals
- Open questions

Mutation rule:
Do not create, update, publish, reparent, close, comment on, or otherwise mutate anything.
```

## `/jira update` Route

Use `/jira update <ticket key or URL> <cleanup request>` when an existing issue needs cleanup, reformatting, splitting, or other hygiene work that preserves the current issue type.

Read and follow [`references/update.md`](references/update.md). Fetch the ticket, identify its current issue type, and compare it to the matching reference workflow: [`epic.md`](references/epic.md), [`story.md`](references/story.md), or [`task.md`](references/task.md). Return a short recommendation plus the exact proposed Jira change. The update route must never change the issue type; if the type appears wrong, report it as hygiene and route to a separate decision instead of including it in the Jira write.


## Workflow

1. **Normalize the input**
   - Extract Jira keys, repo names, PR links, feature names, actors, and likely initiative or epic references.
   - If the request is only a vague one-liner, continue investigation before asking questions.
   - Do not ask the user to classify non-trivial work before the needed research lanes have searched obvious local, Jira, Confluence, and GitHub context.

2. **Gather context**
   - Use Top-Level Research for menial, narrow, or clearly task-shaped requests.
   - Use Deep Research when the recommendation would be risky without broader evidence.
   - For deep research, launch the needed specialist subagents in parallel and combine their findings.
   - Read relevant workspace context yourself when needed to verify, connect, or expand research findings.
   - Search local artifacts for related Jira keys, terms, feature names, and similar ticket shapes when a promising local lead appears or local context is needed.
   - Prefer recent tickets worked by Ethan Conneely or Chris Holmes when the user asks for familiar examples. Also consider obvious "Chris" variants from Jira results if the exact surname differs.
   - If the user passes an existing Jira key, search local files for that key and nearby terms so the report can say whether local drafts or specs already exist.

3. **Verify Jira context**
   - If a Jira key is present, fetch it and identify issue type, status, parent, children, linked issues, assignee, reporter, Feature Team, labels, and description.
   - For a passed Jira ticket, explicitly check whether the parent and Feature Team are present. Treat missing values as ticket hygiene findings to surface in the recommendation, not as blockers to investigation.
   - If only an idea is present, use top-level Jira search for narrow requests and a Jira Search specialist for deep research.
   - For current sprint or board shape, use the available board cache when present, then Jira MCP if live data is needed.

4. **Classify the shape**
   - **Existing ticket update**: same outcome already exists and needs description, AC, parent, or status cleanup.
   - **Task**: internal enablement, dependency work, migration, docs, setup, security remediation, or platform plumbing.
   - **Story**: actor-facing behavior with a clear user story and testable outcome.
   - **Epic**: multiple Stories and Tasks under one outcome, parented to a verified Initiative.
   - **Initiative breakdown**: broad Initiative needs several epics, metrics, and value framing before tickets.
   - **Spike**: meaningful unknowns prevent responsible slicing or estimation.
   - **Duplicate / related only**: do not create yet; link or update existing work.

5. **Assess breakdown need**
   - Recommend breakdown when the work has multiple actors, multiple repos, multiple measurable outcomes, multiple lifecycle phases, or more than one implementation stream.
   - Prefer 3-8 child tickets for a normal epic. If more than 10 are likely, recommend initiative-to-epic shaping first.
   - Separate actor-facing stories from internal tasks.

6. **Surface metrics and value**
   - Capture measurable outcomes before recommending ticket creation.
   - If metrics are missing for an Initiative or Epic, flag them as open questions rather than inventing them.
   - Use progress signals that can be observed without reading implementation code.

7. **Recommend next action**
   - Return an investigation report using the template below.
   - Ask for confirmation before invoking any creating, publishing, reparenting, or breakdown workflow.
   - End by prompting the user with `AskQuestion` so they can choose the next path.
   - The first prompt after the report should route the work, not gather broad requirements. Offer only actions that make sense for the current ticket or idea.

8. **Continue from the selected route**
   - If the user selects a route, perform only that route's next safe step.
   - If the route is a Jira write, draft the exact change and ask for explicit Jira-write confirmation before editing.
   - If the route is Task, Story, Epic, Use Cases, Breakdown, or Update, read and follow the matching reference workflow before continuing.
   - If the user selects "Search More", gather the missing context and return another short report with a new `AskQuestion` route prompt.
   - If the user selects "Do Nothing", stop cleanly.

Omit empty sections. Keep the report concise unless the user asks for a deeper analysis.

## Required Route Prompt

After every investigation report, use the `AskQuestion` tool to guide where to go next. This is the main interaction model for the skill. The prompt must reflect the recommendation and only include options that are valid for the current situation.

Use this shape unless the ticket needs a narrower prompt:

```text
Title: <KEY or short idea> - Next step

Prompt:
I found <short status and recommendation>. What would you like to do?
```

Use concise option labels such as:

- `Task` -> read and follow [`references/task.md`](references/task.md).
- `Sub-task` -> read and follow [`references/task.md`](references/task.md), using the Sub-task issue type and a required parent issue.
- `Story` -> read and follow [`references/story.md`](references/story.md).
- `Epic` -> read and follow [`references/epic.md`](references/epic.md).
- `Use Cases` -> read and follow [`references/use-cases.md`](references/use-cases.md).
- `Breakdown` -> read and follow [`references/breakdown.md`](references/breakdown.md).
- `Update` -> read and follow [`references/update.md`](references/update.md).
- `Clean Up Ticket` -> read and follow [`references/update.md`](references/update.md).
- `Search More` -> continue investigation.
- `Do Nothing` -> stop.

Route prompt rules:

- Include 3-5 options in normal cases.
- Make the recommended path the first option when there is a clear recommendation.
- Include `Search More` when duplicate risk, parentage, ownership, repo state, PR state, or delivery scope is uncertain.
- Include `Do Nothing` unless the user explicitly asked to create or update something and the next gate is already clear.
- When the recommendation depends on missing information, include an option to provide or search for that missing information instead of offering a Jira write as the primary path.
- When a route needs a new Jira ticket title, use `AskQuestion` before finalizing the title. Offer 3-5 recommended title options from the investigation context, put the strongest recommendation first, and include a custom-title option when the wording is not obvious. Do not silently invent the final ticket title.
- Do not proceed to a handoff or Jira write until the user selects an option and any relevant stop gate is satisfied.
- If the user selects a route and that route reveals another decision, use `AskQuestion` again with the new, narrower fork.

## Handoff Rules

- Use [`references/task.md`](references/task.md) only after the user confirms a new internal Task or Sub-task. Sub-tasks use the same Task description format, with Jira issue type `Sub-task` and a required parent issue.
- Use [`references/story.md`](references/story.md) only after the user confirms a new actor-facing Story.
- Use [`references/epic.md`](references/epic.md) only after a verified Initiative parent is known.
- Use [`references/use-cases.md`](references/use-cases.md) when an Epic needs agreed actor/action use cases before child Stories, Specs, or implementation planning.
- Use [`references/breakdown.md`](references/breakdown.md) when an existing issue needs a recommended delivery breakdown, split, child-ticket plan, or no-split recommendation.
- Use [`references/update.md`](references/update.md) when an existing issue needs cleanup, reformatting, splitting, or other hygiene work that preserves the current issue type.
- If an Initiative needs multiple epics, present the proposed epic set and stop for confirmation. Do not create epics in the same step.

## Stop Gates

| Gate | When | Action |
|------|------|--------|
| Missing parent | Recommendation depends on Initiative or Epic parent | Ask for the key or search and confirm candidates |
| Missing ticket parent | A passed Jira ticket has no parent and should be parented before delivery | Surface as Ticket Hygiene and ask whether to search for or assign a parent |
| Missing Feature Team | A passed Jira ticket has no Feature Team | Surface as Ticket Hygiene and recommend setting the appropriate team convention before delivery |
| Metrics unclear | Initiative or Epic has no measurable outcome | Ask for success metrics or propose placeholders clearly marked as questions |
| Duplicate risk | Similar tickets exist | Present candidates and ask whether to update/link instead of create |
| Jira write | Any create, update, reparent, close, or publish action | Stop and ask for explicit confirmation |
| Broad scope | Idea appears larger than one epic | Recommend initiative breakdown and wait for approval |

## Do Not

- Do not create, update, reparent, close, or publish Jira issues.
- Do not invent Jira custom field option ids.
- Do not set individual assignees; use Feature Team conventions from the downstream Jira skill.
- Do not force every idea into a new ticket when related work already exists.
- Do not hide uncertainty in generic acceptance criteria.
