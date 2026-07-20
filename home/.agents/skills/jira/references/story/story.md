# Jira Story

Use this route after `/jira story` or `/jira` has confirmed the work should become a new actor-facing Story.

Stories are for actor-facing delivery slices that can be specified with a user story, scope, acceptance criteria, and explicit out-of-scope boundaries.
Use [`../task/task.md`](../task/task.md) for internal chores with no actor-facing behavior.
Use [`../epic/epic.md`](../epic/epic.md) for broader outcomes under an Initiative.

## Workflow

1.
Collect inputs: project key, story intent, parent epic key, optional Feature Team, labels, dependencies, references, relevant repositories, and developer-facing context.
2. Parent epic gate. Ask once for the epic when missing. The user may say `skip`.
3. Fetch parent when known. Confirm the parent, read summary/context, and copy Feature Team when available.
See [`../jira-fields.md`](../jira-fields.md) for Feature Team, assignee, and create parameters.
4. Clarify if vague. Read [`../clarify-vague.md`](../clarify-vague.md).
If actor, outcome, scope, or testable acceptance criteria are unclear, ask targeted questions before drafting.
5. Draft locally before Jira create. Read [`../local-draft.md`](../local-draft.md) and use the ticket template in [`template.md`](template.md).
6. Run the **Jira Write Approval Gate** in `SKILL.md`.
   Include the local draft path and summary in the gate `prompt`.
7. Promote only when the gate is answered `Approve` by creating the Jira Story with issue type `Story`, markdown content, and the parent epic when known.
8. Update the local record with Jira key, URL, and status. Update local hierarchy context when the parent epic is known.

## Writing Rules

| Rule | Requirement |
|------|-------------|
| Issue type | Always Story unless the user explicitly requests another type |
| Summary length | <= 80 characters |
| Summary style | Imperative verb first, no issue key prefix, no trailing period |
| Actor | Prefer a human GP role or named external actor |
| Scope | Concrete enough to separate this story from sibling stories |
| Acceptance criteria | Bullets only, each one observable and testable |
| Out of scope | Required when related sibling stories or deferred slices exist |
| Developer notes | Include likely repos, docs, patterns, dependencies, and constraints. Mark uncertain items as `TBD` |
| Jira keys | Allowed in metadata and prose references. Do not put Jira keys inside Gherkin bodies |

System-only stories need explicit justification.

## Do Not

- Do not create Jira without a local draft.
- Do not use Story for non-behavioral internal chores. Use [`../task/task.md`](../task/task.md).
- Do not copy implementation plans into the story body.
- Do not put large scenario sets in Jira when a separate artifact is the source of truth.
