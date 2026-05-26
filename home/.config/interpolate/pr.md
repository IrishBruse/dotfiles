Open or refresh a GitHub PR from the **current branch** (`pr create` / `pr update` style).

**Repository:** `{{cwd}}`

**Branch:**

```!git branch --show-current
```

**Base:** `origin/main`, else `main`. Embedded diff below is the source of truth — do not re-run `git` or `gh` to refetch.

## Existing PR

```!gh pr view --json title,body,url 2>/dev/null || echo "(none — create)"
```

## Commits

```!git log origin/main..HEAD --oneline 2>/dev/null || git log main..HEAD --oneline 2>/dev/null || echo "(none vs main)"
```

## Diff stat

```!git diff origin/main...HEAD --stat 2>/dev/null || git diff main...HEAD --stat 2>/dev/null || echo "(empty)"
```

## Diff

```!git diff origin/main...HEAD 2>/dev/null || git diff main...HEAD 2>/dev/null || echo "(empty)"
```

## Repo template

{{prTemplate}}

## Default body

When no repo template: use this shape. Omit unused **Added** / **Removed** / **Changed** lines. Do not copy HTML comments into the PR.

## Summary

<!-- 2-3 lines: what changed and why. No file paths or change inventories. -->

- **Added:**
- **Removed:**
- **Changed:**

## Details

<!-- 1-3 topical ### sections (by theme, not by file). Lead with a short sentence, then 2-5 bullets per section. -->

### 

- 

<!-- Optional: ## Contract changes — only when API or contract-facing work matters. -->

## Rules

(from `pr` CLI — keep the PR tight)

- **Diff wins.** Title and body must match the diff; do not invent scope. If the diff is empty or trivial, say so briefly.
- **Title:** one line, specific to the change — not the branch name alone.
- **Body:** repo template if present, else **Default body**. On **update**, reconcile with the existing PR body; drop stale testing blocks.
- **Summary:** what and why for reviewers — not an essay, no `path/to/file` inventories.
- **Details:** a few topical sections (by theme). Skimmable lead sentence + handful of bullets; not one bullet per file.
- **Skip:** Testing checklists, TODO/follow-up lists, Jira or validator meta.

## Task

1. **Create** (`gh pr create`) or **edit** (`gh pr edit`) from `{{cwd}}` on the current branch.
2. `--title` and `--body-file` (temp file). Do not paste the full body in chat.
3. Reply with only the PR URL when done.
