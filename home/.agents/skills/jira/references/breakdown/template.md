# Breakdown Template

Template for the Breakdown route. See `breakdown.md` for the workflow, definitions, and gates.

```markdown
---
title: "Breakdown: <SOURCE-KEY>"
source_type: "<Initiative|Epic|Story|Task|Bug|Other>"
recommendation: "<split|keep as-is|reclassify|create children|create siblings|create parent outcome>"
created: "N"
not_created: "N"
orphan: "N"
recommendation_only: "N"
---

## Increments

| # | Increment | Progress signal |
|---|-----------|-----------------|
| 0 | <increment> | <observable signal> |

## Backlog

| Title | Type | Inc | Jira status | Key | Status | Parent | Depends on | Open questions |
|-------|------|-----|-------------|-----|--------|--------|------------|----------------|
| <title> | Story | 1 | Created | NOVACORE-12345 | <workflow status> | <parent key> | - | - |

<!-- Type: Epic|Story|Task|Bug|Sub-task|Recommendation. Jira status: Created|Not created|Local draft|Orphan|Recommendation only. -->

## Dependency diagram
## Jira hygiene
```
