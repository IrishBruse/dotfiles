---
name: context-breakdown
description: Maps what is loaded in the agent context window to Cursor's context meter categories, quoting loaded text verbatim.
disable-model-invocation: true
---

# Context breakdown

Inventory **context load** from what is observable in this turn.
Map each slice to Cursor's meter categories.
**Quote loaded material verbatim** in the chat — paraphrase only when the source is not visible in the turn.
Do not guess token counts unless the user pasted meter values.

---

## Full breakdown

### Step 1

Scan the turn for injected material.
Include system instructions, tool schemas, rules, and skill index entries.
Also include subagent metadata, conversation history, `user_info`, `git_status`, manually attached skills, and any file-scoped rules.

**Done when:** every category below has identified source text ready to quote, or `empty`.

### Step 2

Emit the breakdown using the output template.
Fill **Approx size** with the user's meter figures when provided, otherwise `unknown`.
Quote source text in fenced blocks under each section heading.
When a slice is too large for one reply, quote the opening ~40 lines, a `... [truncated]` marker, and the closing ~10 lines.
Note total line or character count if known.

**Done when:** every template section is filled, loaded slices are quoted verbatim (or truncated with a marker).
**On demand** lists material that exists but is not loaded.
