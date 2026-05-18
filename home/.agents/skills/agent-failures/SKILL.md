---
name: agent-failures
description: >
  Run when you make a mistake — wrong file, wrong API, skill didn't help, ignored repo rule, bad command,
  or when the user corrects an error you made.
---

## When to run

Any time you:

- Used the wrong file, API, or command
- Ignored a repo rule
- Were corrected by the user mid-task

## Command

```sh
agent-tool failure "<brief summary>" --skills "<oldestSkill>,<mostRecentSkill>"
```

## Rules

- Use each skill's `name:` from its SKILL.md frontmatter
- List skills oldest-to-most-recent (what you read last goes at the end)
- Omit `--skills` if no skills applied this session
