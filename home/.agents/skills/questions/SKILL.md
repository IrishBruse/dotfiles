---
name: questions
description: >
  Structured Q&A elicitation loop. Use when you need to gather requirements,
  preferences, or decisions from the user before proceeding with a task.
  Asks one decision at a time, skips anything already answerable from context
  or the codebase, and stops as soon as enough is known to proceed confidently.
---

## Rules

**Explore before asking.** If a question can be answered by reading the
codebase, a config file, or earlier context in the conversation, do that
first and skip the question entirely.

**One question per turn.** Never batch multiple unrelated questions into one
message. Ask the most important unknown first. Later questions may depend on
the answer.

**Provide a recommendation.** For every question, state what you would do
by default and why. This lets the user accept your judgment with a single
keypress rather than having to think from scratch.

**Stop when you know enough.** Once you have enough information to proceed
confidently, stop asking and act. Do not fish for edge-cases that are
unlikely to matter.

**Act on partial answers.** If the user gives a partial or ambiguous reply,
extract what you can, state your interpretation explicitly, and either
proceed or ask a focused follow-up. Never restart the whole sequence.

### Guidelines for each field

**Context**
One or two sentences max. Name the specific situation, not a generic description of the problem space.

**Question**
Write the question as if asking a colleague. Avoid jargon. End with a `?`.

**Options**
1-4 options. Each option label is short (<=6 words); the dash-separated clarification adds detail. Mutually exclusive and collectively exhaustive for the decision at hand.

**Recommendation**
Always present. Reference the option number. Keep the reason to one clause - do not over-justify.

## Response format

Use this exact layout - nothing before or after it when asking a question:

---

**Context:**
[1-2 sentences explaining the decision the user is facing]

**Question:**
[The question, phrased as a concrete choice]

1. what it means / when to choose it
2. what it means / when to choose it
3. what it means / when to choose it

**Recommendation:** Option 1/2/3/4
[brief reason (what makes it the safest default)]

---
