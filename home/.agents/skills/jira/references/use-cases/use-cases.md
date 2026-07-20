# Jira Use Cases

Use this route after `/jira use-cases` or `/jira` has confirmed an existing Epic needs agreed actor/action use cases before child Stories, Specs, or implementation planning.

This route is for Jira-first Epic discovery. Persist agreed use cases using workspace artifact conventions when keeping them local.
Posting to Jira is optional and requires an `Approve` answer from the **Jira Write Approval Gate** in `SKILL.md`.

Pipeline position: Epic -> Use Cases -> Stories -> Spec -> Plan -> Implement.

## Output Rule

Every assistant reply and Jira comment produced by this workflow must use the literal characters `<` and `>` wherever a comparison or threshold is meant.

Use `< 5 min`, `< 300ms`, `< 1%`, and `> 10 use cases`.

Do not use `&lt;`, `&gt;`, `&amp;lt;`, or `&amp;gt;`.

## Human-First Elicitation

Do not draft Spine, Outcomes, Extensions, Preconditions,
or Key Rules until the human has supplied an initial actor and action roster and the agent supplement pass is complete.

Exception: if the human explicitly asks the agent to propose actors first, suggest only a short actor and one-line action list.
Still do not produce full use cases until they confirm or edit that roster.

## Operating Stance

Act as a strategic requirements architect. Deconstruct the Epic into use cases to prepare for Example Mapping, not to specify implementation.
Prefer explicit metrics and traceability from actor goals to outcomes.

A Red Card is a blocking gap: missing goal, business value, explicit metric, or an actor goal that cannot trace to a metric.
Flag Red Cards for the human or product before pretending the value frame is settled. The human may answer, defer, or waive. Record the decision.

## When To Use

Use when:

- An approved Epic exists in Jira and needs to be broken into implementable work.
- The team needs shared understanding of what the Epic covers before writing Stories.
- You want a traceable record of agreed use cases attached to the Epic or stored locally under a change folder.

Do not use when:

- The Epic is too vague to extract use cases from. Escalate to product refinement.
- The work is a single tiny change. Route to [`../story/story.md`](../story/story.md) or [`../task/task.md`](../task/task.md).

## Use Case Rules

| Field | Cardinality | Rule |
|-------|-------------|------|
| Actor | >= 1 | Must be a human with a known GP role. Do not use "the system" as the sole actor unless the Epic explicitly defines a system-only scenario and product agrees |
| Action | Exactly 1 | Must state what the actor is trying to achieve at a business or user level. Must not name implementation |
| Outcomes | >= 1 | Observable, testable results. Avoid vague wording unless tied to an agreed metric |
| Preconditions | 0+ | Capabilities already in place before this use case can run. Prefer explicit `None` or `N/A` with human confirmation |
| Key rules / constraints | 0+ | Non-negotiable rules: policy, validation, security, privacy, compliance, or integration boundary |

Metric and spine rules:

- Each use case must tie to at least one explicit metric from the Epic value frame, or have a waived Red Card.
- Every Actor has a Goal that should trace to an Epic metric.
- Each Spine should include 3-7 numbered happy-path steps only.
- Extensions capture alternates or errors discovered at decision points.

## Validation Checklist

- [ ] All thresholds use literal `<` and `>`.
- [ ] Value frame is present or Red Cards / waivers are explicitly recorded.
- [ ] Human supplied initial actors and one-line actions before elaboration.
- [ ] Each use case traces to a metric or has a waived Red Card.
- [ ] At least one human GP role is an Actor.
- [ ] Each Action is exactly one business-level intent with no technical prescription.
- [ ] Each use case has at least one testable Outcome.
- [ ] Spine is present where practicable: 3-7 happy-path steps.
- [ ] Preconditions and constraints lists are honest.

## Workflow

### 1. Load Epic Context

Do not display full Epic detail at the start.
Keep full description, AC, labels, and linked issues in working notes unless the human explicitly asks to see them.

1. Collect the Epic key.
2. Fetch the Epic from Jira.
3. Extract the value frame from the Epic text:
   - Goal.
   - Business value.
   - Explicit metrics.
4. If any value-frame element is missing or vague, raise Red Card questions. Do not fabricate metrics.
5. Present the value frame and Red Cards in a short table or list.
6. Confirm Epic scope using issue key and summary only, plus one sentence if needed.
7. Ask: "Is this the right epic? Anything not in Jira that I should know? Can you resolve or waive the Red Cards?"
8. Stop until the human confirms Epic context and resolves, defers, or waives Red Cards.

### 2. Gather Supporting Context

From the Epic text plus repo context, produce a draft list:

- Bounded contexts likely involved.
- Stakeholders and human actors.
- Services or APIs referenced or implied.
- Features or capabilities in scope.

Show the draft list only. Do not quote or summarize the Epic description again.

Gate: stop until the human confirms or edits supporting context.

### 3. Human Actors And Actions

Ask the user in plain chat (no code fence) who the main human actors for this epic are, using GP role names as their org uses them.

Then ask, again in plain chat, what the main action each actor needs is.
One line each, at business / user intent and not APIs, services, or components.

Hard stop until the human provides this roster or explicitly asks the agent to propose actor and one-line action candidates only.

Gate: human confirms the captured actor/action lines are correct.

### 4. Agent Supplement

Only after the roster gate:

1. Ask clarifying questions about gaps, ambiguous roles, and overlaps.
2. Suggest extra actors or one-line actions implied by the Epic.
3. Ask CRUD or lifecycle prompts as questions.
4. Add lightweight metric trace for each agreed actor/action line.
5. Raise Red Cards where traceability is missing.
6. Stop until the human confirms the complete actor/action roster.

Still no Spine or Outcomes at this stage.

### 5. Elaborate Use Cases

Only after the full roster is agreed.

For each agreed actor/action line, draft:

- Title: usually `[Actor] + [action verb] + [result]`.
- Action: one business-level user intent.
- Spine: 3-7 happy-path steps.
- Extensions: alternates or errors from decision diamonds.
- Outcomes, Preconditions, and Key Rules.

Use the Use Case Template in [`template.md`](template.md).

Introduce the review in plain chat (no code fence): tell the user these are the use cases expanded from the agreed actor/action roster,
and invite them to review together.

### 6. Collaborative Refinement

Walk through each use case with the human via the `AskQuestion` tool. This describes tool input, so never print the labels or any fence as chat text.
Use these `options`:

- `Accept as-is`
- `Modify - tell me what to change`
- `Remove - this does not belong`
- `Split - this is actually multiple use cases`

After reviewing all, ask the user in plain chat whether any use cases were missed.

Final confirmation gate: use the `AskQuestion` tool (`title`: `Use Case Agreement`) with these `options`, and never print the labels or any fence as chat text:

- `Yes - persist`
- `No - I want to make more changes`
- `Stop - I need to think about this more`

### 7. Persist

Ask where to persist via the `AskQuestion` tool. This describes tool input, so never print the labels or any fence as chat text. Use these `options`:

- `Local artifacts only`
- `Jira comment only`
- `Local artifacts + Jira comment`

For local persistence, write agreed use cases using workspace artifact conventions.

### 8. Persist To Jira

Before posting, check for an existing comment containing:

```text
## AI-DLC: Agreed Use Cases
```

If found, ask whether to:

1. Replace the old comment.
2. Add alongside and mark the latest authoritative.
3. Skip Jira persistence.

If replacement is not possible, post a superseding comment that states it replaces the prior agreed-use-cases comment.

Format the Jira comment with the header shown in [`template.md`](template.md).

Post the comment only after an `Approve` answer from the **Jira Write Approval Gate** in `SKILL.md`.

## Important Notes

- This workflow produces use cases, not stories.
- Use cases describe what scenarios the Epic covers, not how they will be implemented.
- Order matters: human actors and one-line actions first, agent supplement second, Spine / Outcomes / Constraints only after roster agreement.
- The Spine feeds Example Mapping.
- The Jira comment is the traceable record of human-agent agreement.
