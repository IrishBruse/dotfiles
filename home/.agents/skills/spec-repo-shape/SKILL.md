---
name: spec-repo-shape
description: >-
  Spec framework: canonical repo layout and doc path map. Single source of truth for file locations and structure.
  Invoke explicitly (/spec-repo-shape). Other spec-* skills read this first; do not duplicate layout elsewhere.
disable-model-invocation: true
---

# Spec repo shape

**Only this skill defines paths and directory layout.** Other **spec-*** skills reference roles below, not alternate path lists.

Project `AGENTS.md` may override specific paths or add verify commands. If `AGENTS.md` conflicts with this skill on paths, `AGENTS.md` wins for that repo.

## Spec framework skills

Invoke by name (all have `spec-` prefix, `disable-model-invocation: true`):

| Skill | Purpose |
|-------|---------|
| `spec-repo-shape` | Layout and doc roles (this file) |
| `spec-design-docs-sync` | Persist decisions across design docs |
| `spec-gap-analysis` | Why a build target fails |
| `spec-task-implement` | Implement Task-N specs in order |
| `spec-docs-code-audit` | Align code with user docs |

Non-framework helpers (no `spec-` prefix): `questions`, `walkthrough`, etc.

## Layout

```
AGENTS.md              # verify commands, doc map, agent rules
docs/                  # user-facing (audit target)
  design/              # main design + .mmd diagrams
DesignDecisions.md     # dated log
LANGUAGE.md            # glossary
specs/tasks/
  Milestone_1.md       # task index + status
  Task-1.md            # acceptance + constraints
  Task-2.md
```

Optional: `specs/README` (task conventions), `docs/status.md`, `docs/limitations.md` (gap cross-check).

## Doc roles

| Role              | Path                           | Contents                                                             |
| ----------------- | ------------------------------ | -------------------------------------------------------------------- |
| **agents**        | `AGENTS.md`                    | Verify CLI, coding rules, pointer to this layout, per-repo overrides |
| **decisions log** | `DesignDecisions.md`           | Dated entries, why X was chosen                                      |
| **glossary**      | `LANGUAGE.md`                  | Term definitions only                                                |
| **main design**   | `docs/design/`                 | Current behavior, milestone scope; link `.mmd` diagrams              |
| **diagrams**      | `docs/design/*.mmd`            | Mermaid source; link from design markdown                            |
| **task index**    | `specs/tasks/Milestone_<n>.md` | Ordered tasks, milestone status                                      |
| **task spec**     | `specs/tasks/Task-<n>.md`      | Acceptance criteria, constraints                                     |
| **user docs**     | `docs/`                        | Consumer-facing contract (not `docs/design/`)                        |

## Task naming

- Index: `Milestone_1.md`, `Milestone_2.md`, ...
- Tasks: `Task-1.md`, `Task-2.md`, ... (sort order = implement order)
- User may name a different `specs/tasks/` file; still use this role naming unless they override

## Skills that consume this map

| Skill                   | Uses                                                   |
| ----------------------- | ------------------------------------------------------ |
| `spec-design-docs-sync` | decisions log, glossary, main design, diagrams, agents |
| `spec-task-implement`   | task index, task spec, agents (verify)                 |
| `spec-gap-analysis`     | agents, user docs, optional status/limitations         |
| `spec-docs-code-audit`  | user docs, agents                                      |

## Bootstrap

When paths are missing and the user allows new files:

1. Create directories/files from the layout table (minimal stubs).
2. Add a short **Doc layout** section to `AGENTS.md` pointing agents to `spec-repo-shape` and listing any overrides.
