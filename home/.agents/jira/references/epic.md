# Jira Epic

Use this route after `/jira epic` or `/jira` has confirmed the work should become a new Epic.

Epics must be parented to a verified Jira Initiative. They group related stories under a larger goal and usually span multiple sprints.

## Hard Requirement

A Jira Initiative is mandatory. Do not draft or create an Epic without an Initiative issue key or URL.

If no Initiative key or URL is provided, stop and ask:

```text
Which Jira initiative does this epic belong to? (issue key e.g. NOVACORE-12345, or full Jira URL).
```

## Workflow

1. Collect inputs: project key, epic intent, required Initiative key or URL, optional Feature Team, labels, priority, and references.
2. Initiative gate. Do not proceed without an Initiative key or URL.
3. Fetch the Initiative. Verify `issuetype.name == "Initiative"`. If not, stop and ask for a corrected key.
4. Optional workspace anchor. If the Initiative maps to local context artifacts, read the relevant context when present.
5. Fit check. Decide whether the proposed Epic belongs to this Initiative. If it does not fit, stop and propose a better route.
6. Clarify if vague. Ask targeted questions if expectations or scenarios cannot be written specifically.
7. Feature Team. Resolve in order: copy from the Initiative, copy from a sibling Epic, ask once.
8. Draft locally before Jira create using workspace artifact conventions.
9. Stop gate. Show the draft file path and summary. Ask whether to keep it local or promote it.
10. Promote only after draft confirmation stop gate by calling `createJiraIssue`.
11. Reply with issue key, browse URL, parent Initiative, Feature Team, and summary. Update the local draft and hierarchy context.

## Ticket Template

The Jira description uses three sections: Context, Expectations, and High-level Scenarios.

```markdown
## Context

<1-3 short paragraphs. What exists today, what changes, why it matters. Must reference how this epic advances the parent initiative's goal.>

## Expectations

- <Concrete expectation. Observable outcome.>
- <...>

## High-level Scenarios

```gherkin
Given <precondition>
And <precondition>
When <event>
Then <outcome>
And <outcome>
```

```gherkin
Given <precondition>
When <event>
Then <outcome>
```
```

Summary line:

```text
<imperative verb> <object> [context]
```

## Writing Rules

| Rule | Requirement |
|------|-------------|
| Issue type | Always Epic |
| Parent | Always a verified Jira Initiative key |
| Summary length | <= 80 characters |
| Summary style | Imperative verb first, outcome-oriented, no issue key prefix, no trailing period |
| Context length | 1-3 short paragraphs. No bulleted lists. No technical implementation detail |
| Expectations | Single observable outcomes. Avoid "works correctly" and "as expected" |
| High-level Scenarios | At least one Gherkin scenario. Wrap each scenario in its own fenced ```gherkin code block, one scenario per block. No Jira keys inside Gherkin blocks. One event per scenario |
| Initiative tie-in | Context must explicitly link the Epic outcome to the parent Initiative goal |
| No story-level detail | Do not list individual stories, tasks, or technical steps |
| Clarity | Enough context for a stakeholder unfamiliar with the conversation |

## No Implementation Detail

Epics describe what changes for whom and why, not how it will be built. Implementation choices belong in story specs, example maps, ADRs, and implementation plans.

Strip these from Context, Expectations, and Scenarios:

- Specific service names, table names, queue names, bucket names, topic names.
- Field counts, payload schemas, column lists, JSON shapes, API methods, and API paths.
- Technology choices unless the Initiative explicitly names them as constraints.
- Deduplication, retry, batching, CORS, and auth protocol mechanics.
- File paths, function names, class names, and module names.
- Environment shapes and regional topology.
- Internal phase names or numbering.

Allowed in Context:

- The user-visible problem and outcome.
- The actors involved.
- Why it matters for the parent Initiative goal.
- High-level constraints from the Initiative.
- Links to architecture or implementation references instead of inlining them.

Self-check before draft confirmation:

- Could a different team pick a different tech stack and still satisfy every Expectation?
- Does any Scenario name a service, table, payload field, or protocol?
- Does Context name a specific technology that the parent Initiative does not already require?

If the user insists on inlining implementation detail, note the constraint in one sentence in Context and reference where the decision is recorded.

## Initiative Fit Check

Fits when all are true:

- The Epic outcome advances the Initiative's stated goal.
- The work falls inside the Initiative's scope.
- The expected child Stories naturally roll up to the Initiative roadmap.

Does not fit when:

- The Epic is generic platform work unrelated to the Initiative goal.
- The Epic's primary subject belongs under a different Initiative.
- The work is small enough to be a single Story or Task.

On no-fit, stop. Explain why and propose another Initiative or smaller ticket route. Do not draft until the user redirects.

## Local Draft

Save the draft using the workspace artifact conventions. Include this content shape:

```markdown
# <Title from summary>

**Jira:** _(pending)_
**Initiative:** [NOVACORE-12345](https://globalization-partners.atlassian.net/browse/NOVACORE-12345) - <initiative summary>
**Workspace context:** <local context reference> | none
**Feature Team:** <team-name> | none
**Project:** <PROJECT-KEY>

## Summary

<Imperative summary - same text sent to Jira `summary` field>

---

<Context paragraphs - same text sent to Jira `description`>

## Expectations

- ...

## High-level Scenarios

```gherkin
Given ...
When ...
Then ...
```
```

Persist rules:

- Write before the draft confirmation stop gate.
- Re-read the file at the start of the create step. The file wins over chat if they differ.
- If the user edits the file during review, use the file content for `createJiraIssue`.

## Clarify Vague Requests

Ask before drafting when expectations or scenarios cannot be written specifically.

Vague signals:

- No observable outcome.
- No clear actor or trigger.
- Expectations would all be soft.
- Initiative goal cannot be tied to the request without invention.

Ask only what is missing:

- What changes today vs. after this Epic is done?
- Who triggers the change, and what do they see or get?
- How will we know this Epic delivered value?
- Anything explicitly out of scope?

## Feature Team, Capitalizable, And MCP

Read [`jira-fields.md`](jira-fields.md) for Feature Team, Capitalizable, assignee, and `createJiraIssue` parameters. Use `issueTypeName: "Epic"`.

## Stop Gates

| Gate | When | Action |
|------|------|--------|
| Initiative | Not provided at start | Ask once for issue key or URL and stop until answered |
| Initiative type | After fetch | Reject if `issuetype.name != "Initiative"` and ask for corrected key |
| Fit check | Initiative and intent known | Stop and propose alternative if no fit |
| Clarification | Intent too vague | Ask targeted questions and stop until answered or user says draft anyway |
| Implementation-leak check | Before draft confirmation | Rewrite any Expectation or Scenario that names tech, payload, service, or protocol |
| Draft confirmation | Before `createJiraIssue` | Save local draft and wait for explicit approval or file edits |

## Do Not

- Do not create an Epic without a verified Initiative parent.
- Do not accept a non-Initiative issue type as parent.
- Do not draft when the fit check fails.
- Do not put story-level detail, task lists, or technical implementation in the Epic description.
- Do not include Jira keys inside Gherkin scenario blocks.
- Do not use Story or Task issue type from this route.
- Do not copy the Initiative summary verbatim into the Epic Context.
