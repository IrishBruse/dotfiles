---
name: walkthrough
description: Walk through a skill, document, or plan step-by-step with the user, presenting one section at a time and waiting for approval or feedback before moving on. Use when the user asks to review, walk through, or get feedback on a multi-step skill, spec, or plan.
---

# Review Walkthrough

Presents a document or skill to the user one section at a time for iterative feedback. Only advances when the user approves. Collects and applies feedback inline.

## Process

1. **Load the target** - Read the full document/skill to understand its structure.
2. **Identify sections** - Break it into logical review units (e.g. entry point, then each step or phase).
3. **Present one section at a time** - For each section:
   - Summarize what it does in plain language (no raw markdown dump)
   - List the key actions/decisions in that section
   - End with "Feedback?" or equivalent prompt
4. **Wait for approval** - Do not move on until the user says it's good or gives feedback.
5. **Apply feedback immediately** - If the user requests changes, make the edits and confirm before continuing.
6. **Repeat** until all sections are covered.
7. **Wrap up** - Summarize what was reviewed and confirm the document is complete.

## Presentation format

For each section, provide:

- **Section name/title** as a heading
- A short paragraph explaining its purpose
- A bullet list of the concrete actions or decisions in that section
- Omit implementation details unless the user asks to go deeper

Keep it concise. The user can ask to expand on anything.

## Rules

- Never skip ahead unless the user explicitly says to.
- Never combine multiple sections into one review block unless the user asks for a summary.
- If the user gives feedback, apply it and re-present that section for confirmation before advancing.
- If the user says "looks good", "next", "approved", or equivalent, move to the next section.
