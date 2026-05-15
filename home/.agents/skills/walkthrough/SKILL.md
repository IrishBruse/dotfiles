---
name: walkthrough
description: >-
  Walks through a skill, document, or plan one section at a time and waits for approval or feedback before advancing.
  Use when the user asks to review, walk through, or get feedback on a multi-step skill, spec, or plan.
disable-model-invocation: true
---

# Walkthrough

Presents a document or skill one section at a time for iterative feedback. Only advances when the user approves. Collects and applies feedback inline.

## Process

1. **Load the target** - Read the full document or skill to understand its structure.
2. **Identify sections** - Break it into logical review units (e.g. entry point, then each step or phase).
3. **Present one section at a time** - For each section:
   - Summarise what it does in plain language (no raw markdown dump)
   - List the key actions or decisions in that section
   - End with `Feedback?` or an equivalent short prompt
4. **Wait for approval** - Do not move on until the user says it is good or gives feedback.
5. **Apply feedback immediately** - If the user requests changes, make the edits and confirm before continuing.
6. **Repeat** until all sections are covered.
7. **Wrap up** - Summarise what was reviewed and confirm the document is complete.

## Presentation format

For each section, provide:

- **Section name or title** as a heading
- A short paragraph explaining its purpose
- A bullet list of the concrete actions or decisions in that section
- Omit implementation details unless the user asks to go deeper

Keep it concise. The user can ask to expand on anything.

## Rules

- Never skip ahead unless the user explicitly says to.
- Never combine multiple sections into one review block unless the user asks for a summary.
- If the user gives feedback, apply it and re-present that section for confirmation before advancing.
- If the user says `looks good`, `next`, `approved`, or equivalent, move to the next section.

## Edge cases

- **User wants the full document at once:** output it and stop the stepped walkthrough.
- **User points at a specific section:** jump there, then continue in order unless they say otherwise.
- **Ambiguous target:** ask which file, skill, or plan to walk through.
