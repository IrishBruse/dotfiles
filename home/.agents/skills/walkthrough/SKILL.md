---
name: walkthrough
description: Walks through a response, file, or feature section by section. Use when asked to walk through or break down something, or on /walkthrough.
---

# Walkthrough

Pick a mode from what follows `/walkthrough`.

| Input                  | Mode                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| (none)                 | **Breakdown** - pace the last assistant reply                            |
| File or directory path | **Document review** - one section at a time                              |
| Other text             | Breakdown if pacing a prior reply, otherwise treat as a path or ask once |

If the mode is unclear, ask once: pace the last reply, or walk through a file?

---

## Breakdown mode

Re-send one prior assistant message in order.
Do not summarize.
Keep the original tone, structure, and wording.

1. **Source** - Last full assistant message before this skill, unless the user named another.
2. **Chunks** - Split on headings, lists, topic shifts, or code blocks.
  One idea per chunk (~3-6 sentences when it fits, prefer idea boundaries over a fixed sentence count).
3. **First reply** - Output only chunk 1.
  On `next`, `continue`, `more`, or clear approval, output only the next chunk.
4. **Between chunks** - End with: `Ready for more? Say next or continue.`
5. **After the last chunk** - End with: `That was the full reply.
  Revisit a part, or move on?`
6. **Questions mid-run** - Answer, then offer to resume pacing.

**Edge cases**

- Very short source: one chunk, then done.
- Code-heavy source: prefer one block plus its explanation per chunk.
- User wants everything at once: output the full source and stop.
- User names a section: jump there, then continue in order.

**Do not** add preamble between chunks.
Do not number chunks unless the source did.

---

## Document review mode

Read the path.
For a directory, use `SKILL.md` in that folder.
If it is missing, ask once which file to use.

Present one section at a time.
Do not advance until the user approves.

For each section:

- **Title** - section name
- **Purpose** - brief plain-language summary (no raw markdown dump)
- **Points** - bullets for key actions or decisions (skip implementation detail unless asked)

On feedback: edit the document, re-present that section, then wait again.

On `looks good`, `next`, `approved`, or equivalent: advance to the next section.

**Edge cases**

- User wants the full document: output it and stop.
- User names a section: jump there, continue in order.
- Invalid path: ask which file to use.

When finished: brief summary of what was reviewed and whether the document is complete.
