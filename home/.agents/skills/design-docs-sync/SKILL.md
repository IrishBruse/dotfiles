---
name: design-docs-sync
description: >-
  Keeps multiple design documents consistent when decisions land: decisions log, glossary, main design doc, and optional AGENTS.md.
  Use when the user asks to update design docs as you go, sync terminology, or persist decisions across docs/LANGUAGE/design files.
---

# Design-docs sync

When a design decision is accepted, write it everywhere it matters so docs do not contradict each other.

## Process

1. **Discover** - User or `AGENTS.md` names the doc set. Typical roles (adapt names to the repo):
   - **Decisions log** - dated entries, why we chose X
   - **Glossary / language** - term definitions only
   - **Main design** - current behavior and milestone scope
   - **AGENTS.md** - agent workflow (when to update which file)
2. **On each accepted decision** - Before the next question (if using `questions`), apply edits:
   - Append to decisions log with date and short title
   - Adjust glossary if terms changed or new terms appear
   - Patch main design sections affected (milestone scope only unless user widens)
   - Touch AGENTS.md only when workflow or file roles change
3. **Consistency pass** - Search the doc set for old terms (rename globally in docs, not in code unless asked).
4. **Diagrams** - New or updated flows go in `.mmd` files; link from markdown, do not paste large mermaid inline (CLI display).
5. **Questions** - After sync, continue elicitation with `questions` format if more decisions are needed.

## Rules

- Small edits per decision. Do not rewrite whole docs each turn.
- Use the repo's existing heading and date patterns.
- If only one file was named, update that file but flag cross-doc contradictions in one line.
- Do not invent game or product facts not stated by the user in the session.

## Edge cases

- **User says "apply" or "update docs" without detail:** sync the last agreed decision from the thread.
- **Conflicting prior decision:** replace the old log entry with a dated supersede note, fix glossary.
- **No decisions log exists:** create a minimal `DesignDecisions.md` with one section per date unless user forbids new files.

## Related skills

- Use `questions` for the interview loop (one question per turn, recommendations).
- Use `walkthrough` for section-by-section review of a finished doc, not per-decision sync.
