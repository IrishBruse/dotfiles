---
name: questions
description: Structured Q&A loop that gathers requirements one decision at a time.
disable-model-invocation: true
---

## Rules

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

**Explore before asking.** If a question can be answered by reading the
codebase, docs, or context, do that first and skip the question entirely.

**Provide a recommendation.** For every question, state what you would do
by default and why.
This lets the user accept your judgment with a single
keypress rather than having to think from scratch.

## Response format

Before each `AskQuestion` call, print this:

**Context:**

[One or two sentences max.
Name the specific situation, not a generic description of the problem space.]

**Recommendation:** (option id)
[brief reason what makes it the safest default]

## AskQuestion

Use the `AskQuestion` tool for every decision.
Ask one question at a time.
Put computed context in the `prompt` and option `label` values, not generic placeholders in chat.

This describes tool input, so never print the fields, labels, option text, or any fence as chat text.

Shape each call like this:

```text
AskQuestion
  id: decision-id
  prompt: "Discovered context. The question?"
  options:
    - id: recommended-option
      label: "Recommended choice (tradeoff or consequence)"
    - id: other-option
      label: "Other choice (tradeoff or consequence)"
    - id: other-option
      label: "Other choice (tradeoff or consequence)"
```

Rules:

- Fill every field with concrete values from the current situation.
- Put the recommended option first.
- Use stable `id` values the agent can branch on after the answer.
- Users can always pick **Other** for a custom answer.
