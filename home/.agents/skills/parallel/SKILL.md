---
name: parallel
description: Do something concurrently using parallel subagents.
disable-model-invocation: true
---

Run whatever was next after `/parallel ...` was passed using subagents be that a plan or implementation.

## Ground rules

- Launch every independent subagent in one message so they run concurrently.
- Each prompt is self-contained, a subagent cannot see this chat.
- State in the prompt which files the subagent owns and whether it may write.
- One owner per file. Split by file, folder, or repo.
- The parent aggregates, resolves conflicts, and verifies before accepting a subagent's report.

## Research

Fan out one read-only subagent per folder, repo, or transcript project.
Give them identical report headings so the results merge cleanly.

If a report comes back truncated, `resume` that subagent and ask for it in full.

## Review

One read-only subagent per lens, typically code quality, performance, and reuse of existing patterns,
all given the same diff. When the diff is too large, pass the file list plus the relevant hunks.

## Implementation

1. Break the request into independent, modular tasks.
2. Agree contracts first, interfaces, types, file paths, exports, and put them in every prompt.
3. Assign one task per subagent.
4. Integrate, then run lint, typecheck, and tests end to end.

## Planning and docs

Subagents draft in parallel, the parent writes the file. For skills, include the frontmatter
conventions in each prompt and run `skills lint` after merging.

## Single threaded

Jira and PR writes, releases, and anything with a confirmation gate stay in the parent.
Subagents gather the context, the parent performs the write.
