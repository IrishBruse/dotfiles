---
name: handoff
description: Produces a full handoff summary so a fresh agent can continue the work.
disable-model-invocation: true
---

Produce a `HANDOFF.md` so a fresh agent can continue the work.
No preamble, closing remarks, or commentary outside the handoff.
Include a "suggested skills" section, which suggests skills the next agent should invoke.
Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs).
Reference them by path or URL instead.
Redact any sensitive information, such as API keys, passwords, or personally identifiable information.
If the user passed arguments, treat them as a description of what the next session will focus on and tailor the handoff accordingly.
