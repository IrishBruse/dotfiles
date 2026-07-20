# Jira Epic

Use this route after `/jira epic` or `/jira` has confirmed the work should become a new Epic.

Epics must be parented to a verified Jira Initiative. They group related stories under a larger goal and usually span multiple sprints.

## Contents

- [Hard Requirement](#hard-requirement)
- [Workflow](#workflow)
- [Writing Rules](#writing-rules)
- [No Implementation Detail](#no-implementation-detail)
- [Gherkin formatting for Jira](#gherkin-formatting-for-jira)
- [Initiative Fit Check](#initiative-fit-check)
- [Do Not](#do-not)

## Hard Requirement

A Jira Initiative is mandatory. Do not draft or create an Epic without an Initiative issue key or URL.

If no Initiative key or URL is provided, stop and ask the user in plain chat (no code fence) which Jira initiative this epic belongs to.
Accept an issue key (e.g. NOVACORE-12345) or a full Jira URL.

## Workflow

1. Collect inputs: project key, epic intent, required Initiative key or URL, optional Feature Team, labels, priority, and references.
2. Initiative gate. See **Hard Requirement**.
3. Fetch the Initiative. Verify `issuetype.name == "Initiative"`. If not, stop and ask for a corrected key.
4. Optional workspace anchor. If the Initiative maps to local context artifacts, read the relevant context when present.
5. Fit check. Decide whether the proposed Epic belongs to this Initiative. If it does not fit, stop and propose a better route.
6. Clarify if vague. See `../clarify-vague.md` (Epic row: expectations, scenarios, Initiative tie-in).
7. Feature Team. Resolve in order: copy from the Initiative, copy from a sibling Epic, ask once.
See `../jira-fields.md` for Feature Team, Capitalizable, assignee, and create parameters.
8. Draft locally before Jira create. See `../local-draft.md` and use the ticket template in `template.md`.
9. Run the **Jira Write Approval Gate**.
   Include the local draft path and summary in the gate `prompt`.
10. Promote only when the gate is answered `Approve` by creating the ticket with issue type `Epic`.
11. Reply with issue key, browse URL, parent Initiative, Feature Team, and summary. Update the local draft and hierarchy context.

## Writing Rules

| Rule | Requirement |
|------|-------------|
| Issue type | Always Epic |
| Parent | Always a verified Jira Initiative key |
| Summary length | <= 80 characters |
| Summary style | Imperative verb first, outcome-oriented, no issue key prefix, no trailing period |
| Context length | 1-3 short paragraphs. No bulleted lists. No technical implementation detail |
| Expectations | Single observable outcomes. Avoid "works correctly" and "as expected" |
| High-level Scenarios | Valid Gherkin: `Scenario:` title, indented steps, one per block. See **Gherkin formatting for Jira** |
| Initiative tie-in | Context must explicitly link the Epic outcome to the parent Initiative goal |
| No story-level detail | Do not list individual stories, tasks, or technical steps |
| Clarity | Enough context for a stakeholder unfamiliar with the conversation |

## No Implementation Detail

Epics describe what changes for whom and why, not how it will be built.
Implementation choices belong in story specs, example maps, ADRs, and implementation plans.

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

## Gherkin formatting for Jira

Jira only syntax-highlights Gherkin when the block uses valid Cucumber structure, not bare `Given` / `When` / `Then` lines.

Required shape for every scenario block:

- First line: `Scenario: <short descriptive title>`
- Every step indented with two spaces under the scenario line
- One scenario per fenced ```gherkin block in local drafts
- No Jira keys inside Gherkin bodies

Example:

```gherkin
Scenario: Designer prepares environment through explicit setup
  Given a designer needs to prepare their environment before building a prototype
  When they trigger setup
  Then the environment is prepared through explicit, reviewable actions
  And no bespoke bootstrap step is required
```

When creating or updating the Jira description, publish each scenario as an ADF `codeBlock` with `language: gherkin`.
Use the same `Scenario:` line and two-space-indented steps in the block text.
Do not rely on markdown fences alone in the published description.

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

## Do Not

- Do not use Story or Task issue type from this route.
- Do not copy the Initiative summary verbatim into the Epic Context.
