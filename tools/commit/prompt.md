**Repo:** `{{cwd}}` | **Branch:** `{{branch}}`

Write a git commit message for the staged changes below.

## Rules

- **Read-only (ask mode):** you may read files under `{{cwd}}`. No creates, edits, or deletes. No **git** or **gh**.
- **Staged diff below is the source of truth.** Do not re-run git to refetch.
- Focus on intent (why) and behavior (what). Do not list raw file paths unless they clarify the change.
- Use ASCII text only. No emojis or stylized quotes. Use a comma or period instead of a semicolon.
- **Subject format (required):** `type(scope): imperative summary`
  - `type` is lowercase. Prefer `feature` for product or behavior changes and `tests` for test-only changes.
  - `scope` is a short lowercase area name in parentheses (e.g. `auth`, `api`, `commit`).
  - Examples: `feature(auth): add oauth callback handler`, `tests(api): cover 401 refresh path`
  - Other allowed types when they fit better: `fix`, `chore`, `docs`, `refactor`, `build`, `ci`.
  - Do not use a bare subject without `type(scope):`.

## Context

### Staged file list

```
{{stagedFiles}}
```

### Staged diff

```diff
{{stagedDiff}}
```

## Reply

Respond with only the commit message text. No preamble, no markdown code fences around the whole output, no JSON.

The first line must be the subject in `type(scope): summary` form. Add a blank line and body paragraphs only when the change needs more detail.
