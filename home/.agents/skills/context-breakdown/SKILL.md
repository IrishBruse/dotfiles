---
name: context-breakdown
description: Maps what is loaded in the agent context window to Cursor's context meter categories, quoting loaded text verbatim.
disable-model-invocation: true
---

# Context breakdown

Inventory **context load** from what is observable in this turn.
Map each slice to Cursor's meter categories.
**Quote** every loaded slice **verbatim** in fenced blocks.
Paraphrase only when the source is not visible in the turn, and label those `not visible in turn`.
Do not guess token counts unless the user pasted meter values.

---

## Full breakdown

### Step 1

Scan the turn for injected material.
Include system and communication instructions, mode guidance, and tool-calling rules.
Include the full tool definition block.
Include `<always_applied_workspace_rules>`, `<user_rules>`, and file-scoped rules (for example from Read side effects).
Include `<agent_skills>` index entries and manually attached skills wrapper plus inlined bodies.
Include Task/subagent metadata inside tool schemas.
Include `<user_info>`, `<git_status>`, `<timestamp>`, `<system_reminder>`, `open_and_recently_viewed_files`, and the `agent_transcripts` note.
Include conversation history and any summarized-conversation block.
Include MCP server preamble if present.

**Done when:** every meter row and session section below has identified source text ready to quote, or `empty`.

### Step 2

Emit the full breakdown in **one reply** using the output template.
Section order: Summary, meter categories in table order, Session metadata, On demand, Growth during work, then Meter reconciliation when applicable.
Fill **Approx size** with the user's meter figures when provided, otherwise `unknown`.
Quote source text in fenced blocks under each section heading.
When a slice would overflow the reply, quote as much as fits first.
Then use opening ~80 lines, a `... [truncated, N lines total]` marker, and closing ~20 lines.
Note total line or character count when known.

**Done when:** every template section is filled.
Every loaded slice appears in a fenced block (or head/tail truncation with marker and total line count).
No section uses bullets as a substitute for quoting visible source text.
**On demand** lists material that exists but is not loaded.

---

## Verbatim rules

- Fenced blocks reproduce injected text.
  Topic bullets and "includes X" lists fail Step 2.
- Quote tool schemas in full unless the user asked for names only.
- Quote every indexed skill description, not a table of names.
- Quote conversation messages with role labels.
  Include tool-call payloads and results when present in the thread.

---

## Output template

# Context breakdown

## System prompt

### [region name]
```text
[exact text from turn]
```

## Tools

### `ToolName`
```json
[full description and parameters from schema]
```

## Rules

### `source/path`
```text
[full rule text as injected]
```

## Skills

### Indexed — `skill-name`
```text
[exact description line]
```

### Attached — `skill-name`
```text
[full inlined SKILL.md body]
```

## MCP

### [server or block name]
```text
[verbatim MCP preamble, instructions, and tool list]
```

Or `empty` when no MCP material is injected.

## Subagents

```text
[verbatim subagent metadata from the Task tool definition]
```

## Summarized conversation

```text
[verbatim compressed earlier-turn block, if present]
```

Or `empty` when no summary block is in the turn.

## Conversation

### `user` | `assistant` | `tool`
```text
[verbatim message or tool result]
```

## Session metadata

```text
[verbatim user_info, git_status, timestamp, system_reminder, open_and_recently_viewed_files, agent_transcripts note]
```

## On demand

- [names and paths of material that exists but is not loaded]

## Growth during work

- [what typically adds context next: reads, diffs, shell output, subagent replies, skill bodies]

