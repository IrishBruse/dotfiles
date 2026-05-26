---
name: step-through
description: >-
  Paced step-by-step delivery in two modes. With no argument, replays the last assistant reply in chunks (breakdown).
  With a file or folder path, walks a skill, doc, or plan one section at a time for feedback (walkthrough).
  Use for break down, chunk, pace, next, continue, walk through, review a skill, spec, or plan.
disable-model-invocation: true
---

# Step through

Sequential, paced review. **Use the skill argument** (text after `/step-through`) to choose the mode. If the invocation has no argument, use **Breakdown**.

## Choose mode

1. **No argument** (empty or whitespace only) -> **Breakdown**
2. **Path argument** - Treat as **Walkthrough** when the argument is or resolves to:
   - An existing file or directory
   - A path-like string (contains `/` or `\`, ends in `.md`, or names a known skill folder)
3. **Other text** - Use conversation context:
   - User is pacing through a prior reply -> **Breakdown** (use the argument as a hint for which message)
   - User named a document not yet loaded -> **Walkthrough** after reading that target
4. **Still ambiguous** - Ask once: pace the last reply, or walk through a file?

---

## Mode: Breakdown

Re-present one prior assistant reply as sequential chunks. Preserve substance and wording (no summary, no reframing as a shorter version). Only split and pace delivery.

### Process

1. **Identify the source** - Use the **last full assistant message** before the step-through request, unless the argument named a different reply. If unclear which message, ask which reply to walk through.
2. **Plan chunks** - Split on headings, list items, topic shifts, code block boundaries, or natural pauses. One **chunk** = one clear idea, about **3-6 sentences** when that fits. If sentence count and idea boundaries disagree, prefer idea boundaries.
3. **First request** - Output **only chunk 1**. Do not preview later chunks.
4. **Advance** - On cues like `next`, `continue`, `more`, or `ok` when clearly advancing, output **only** the next chunk in order from the source.
5. **After the last chunk** - Send one short completion line (see Presentation format), then stop unless the user asks for more.

### Presentation format (breakdown)

- After chunk 1 and each intermediate chunk, end with one short line, e.g. `Ready for more? Say next or continue.`
- After the final chunk, e.g. `That was the full reply. Revisit a part, or move on?`
- **Question mid-run:** answer, then offer `Want to pick up where we left off?`

Keep prompts brief and consistent so the user builds a rhythm.

### Rules (breakdown)

- Keep the same tone and structure as the source (code stays code, lists stay lists).
- No preamble or editorialising between chunks unless the user asks.
- Do not number chunks visibly unless the source was numbered.

### Edge cases (breakdown)

- **Very short source:** one chunk, then the completion line.
- **Code-heavy:** one logical code block plus its immediate explanation per chunk when possible.
- **User wants all at once:** output the full source and exit pacing.
- **User skips ahead:** jump to the named section, then continue in order.

---

## Mode: Walkthrough

Presents the target one section at a time for iterative feedback. Only advances when the user approves. Collects and applies feedback inline.

### Process

1. **Load the target** - Read the full document or skill from the path argument. For a directory, prefer `SKILL.md` in that folder; if missing, list candidates and ask once.
2. **Identify sections** - Break it into logical review units (e.g. entry point, then each step or phase).
3. **Present one section at a time** - For each section:
   - Summarise what it does in plain language (no raw markdown dump)
   - List the key actions or decisions in that section
4. **Wait for approval** - Do not move on until the user says it is good or gives feedback.
5. **Apply feedback immediately** - If the user requests changes, make the edits and confirm before continuing.
6. **Repeat** until all sections are covered.
7. **Wrap up** - Summarise what was reviewed and confirm the document is complete.

### Presentation format (walkthrough)

For each section, provide:

- **Section name or title** as a heading
- A short paragraph explaining its purpose
- A bullet list of the concrete actions or decisions in that section
- Omit implementation details unless the user asks to go deeper

Keep it concise. The user can ask to expand on anything.

### Rules (walkthrough)

- Never skip ahead unless the user explicitly says to.
- Never combine multiple sections into one review block unless the user asks for a summary.
- If the user gives feedback, apply it and re-present that section for confirmation before advancing.
- If the user says `looks good`, `next`, `approved`, or equivalent, move to the next section.

### Edge cases (walkthrough)

- **User wants the full document at once:** output it and stop the stepped walkthrough.
- **User points at a specific section:** jump there, then continue in order unless they say otherwise.
- **Path missing or wrong:** ask which file, skill, or plan to walk through.
