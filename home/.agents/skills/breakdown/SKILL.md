---
name: breakdown
description: >-
  Replays a prior assistant reply in small sequential chunks without summarising, so the user can read at their own pace.
  Use when the user asks to break down, chunk, or pace through a response, or says next or continue while chunking.
disable-model-invocation: true
---

# Breakdown

Re-present one prior assistant reply as sequential chunks. Preserve substance and wording (no summary, no reframing as a shorter version). Only split and pace delivery.

## Process

1. **Identify the source** - Use the **last full assistant message** before the user's breakdown request. If unclear which message, ask which reply to walk through.
2. **Plan chunks** - Split on headings, list items, topic shifts, code block boundaries, or natural pauses. One **chunk** = one clear idea, about **3-6 sentences** when that fits. If sentence count and idea boundaries disagree, prefer idea boundaries.
3. **First request** - Output **only chunk 1**. Do not preview later chunks.
4. **Advance** - On cues like `next`, `continue`, `more`, or `ok` when clearly advancing, output **only** the next chunk in order from the source.
5. **After the last chunk** - Send one short completion line (see Presentation format), then stop unless the user asks for more.

## Presentation format

- After chunk 1 and each intermediate chunk, end with one short line, e.g. `Ready for more? Say next or continue.`
- After the final chunk, e.g. `That was the full reply. Revisit a part, or move on?`
- **Question mid-run:** answer, then offer `Want to pick up where we left off?`

Keep prompts brief and consistent so the user builds a rhythm.

## Rules

- Keep the same tone and structure as the source (code stays code, lists stay lists).
- No preamble or editorialising between chunks unless the user asks.
- Do not number chunks visibly unless the source was numbered.

## Edge cases

- **Very short source:** one chunk, then the completion line.
- **Code-heavy:** one logical code block plus its immediate explanation per chunk when possible.
- **User wants all at once:** output the full source and exit pacing.
- **User skips ahead:** jump to the named section, then continue in order.
