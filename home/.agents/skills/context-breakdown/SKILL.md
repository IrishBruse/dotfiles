---
name: context-breakdown
description: Dump the agent's current context to the chat verbatim.
disable-model-invocation: true
---

Reproduce your current context into the chat, using only what is already in your context window right now. Do not read files or call any tools.

- Copy each item exactly as it appears. Preserve original wording and order.
- Include everything you hold: system prompt, rules, skills, tool definitions, already-loaded file contents, and the full message history.
- Skip any item you cannot reproduce verbatim rather than summarizing or approximating it.
