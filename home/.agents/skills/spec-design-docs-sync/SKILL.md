---
name: spec-design-docs-sync
description: >-
  Spec framework: keeps design documents consistent when decisions land (decisions log, glossary, main design, agents).
  Invoke explicitly (/spec-design-docs-sync). Use when syncing terminology or persisting decisions; paths in spec-repo-shape.
disable-model-invocation: true
---

# Spec design-docs sync

When a design decision is accepted, write it everywhere it matters so docs do not contradict each other.

## Process

1. **Discover** - Read `spec-repo-shape` for doc roles and paths; read **agents** (`AGENTS.md`) for verify rules and per-repo overrides.
2. **On each accepted decision** - Before the next question (if using `questions`), apply edits:
   - Append to **decisions log** with date and short title
   - Adjust **glossary** if terms changed or new terms appear
   - Patch **main design** sections affected (milestone scope only unless user widens)
   - Touch **agents** only when workflow or file roles change
3. **Consistency pass** - Search the doc set for old terms (rename globally in docs, not in code unless asked).
4. **Diagrams** - New or updated flows go under **diagrams** (see `spec-repo-shape`); link from markdown, do not paste large mermaid inline (CLI display).
5. **Questions** - After sync, continue elicitation with `questions` format if more decisions are needed.

## Rules

- Small edits per decision. Do not rewrite whole docs each turn.
- Use the repo's existing heading and date patterns.
- If only one file was named, update that file but flag cross-doc contradictions in one line.
- Do not invent game or product facts not stated by the user in the session.

## Edge cases

- **User says "apply" or "update docs" without detail:** sync the last agreed decision from the thread.
- **Conflicting prior decision:** replace the old log entry with a dated supersede note, fix glossary.
- **No decisions log exists:** bootstrap per `spec-repo-shape` unless user forbids new files.

## Related skills

- `spec-repo-shape` - paths and layout (read first).
- `questions` - interview loop (not part of spec framework).
- `walkthrough` - section-by-section review of a finished doc (not spec framework).
