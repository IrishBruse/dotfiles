---
name: ask-questions
description: >
  Structured Q&A elicitation loop. Use when you need to gather requirements,
  preferences, or decisions from the user before proceeding with a task.
  Asks one decision at a time, skips anything already answerable from context
  or the codebase, and stops as soon as enough is known to proceed confidently.
disable-model-invocation: true
---

## Rules

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

**Explore before asking.** If a question can be answered by reading the
codebase, docs, or context, do that first and skip the question entirely.

**Provide a recommendation.** For every question, state what you would do
by default and why. This lets the user accept your judgment with a single
keypress rather than having to think from scratch.

## Response format

Before calling the AskQuestion tool with the 3 questions print this:

**Context:**

[One or two sentences max. Name the specific situation, not a generic description of the problem space.]

**Recommendation:** (Answer 1/2/3)
[brief reason what makes it the safest default]

