# Prose

Rules for the body text of skill markdown (`.md` / `.mdc`).
Fenced code blocks are ignored. Most rules also skip content inside
inline `` `code` `` spans.

These rules keep skill prose short, ASCII-friendly, and specific enough
for an agent to follow.

## `long-line`

Keep prose lines at or under 160 characters.

Long lines are hard to review in diffs and in narrow terminals.
URL-only lines and table rows are allowed. `--fix` wraps simple prose
paragraphs at the nearest space before 160 characters. List items,
headings, blockquotes, and other block markdown are left unchanged.

### Incorrect

A single prose line longer than 160 characters (URL-only lines and table
rows are exempt).

### Correct

```markdown
Always gather the full list of affected services from the deployment
manifest before making any change, including nested dependencies that
are not listed at the top level of the file.
```

## `prose-semicolon`

Prefer a comma (or a split sentence) over a semicolon in English prose.

Semicolons are easy to overuse in dense skill writing. `--fix` rewrites
matching clauses.

### Incorrect

```markdown
Read the ticket; then update the status.
```

### Correct

```markdown
Read the ticket, then update the status.
```

## `non-ascii`

Use plain ASCII in prose.

Fancy quotes, ellipses, and similar characters show up inconsistently
across tools. Keep them in code fences if you need them. `--fix` replaces
common offenders.

### Incorrect

```markdown
Don’t edit the “legacy” path…
```

### Correct

```markdown
Don't edit the "legacy" path...
```

## `em-dash`

Prefer an ASCII hyphen over em/en dashes.

Dashes are fine in code. In skill prose, Unicode em/en dashes should be
plain `-`. `--fix` rewrites them.

### Incorrect

```markdown
Open the PR — then wait for CI.
```

### Correct

```markdown
Open the PR - then wait for CI.
```

## `generic-advice`

Disallow filler phrases that do not change behaviour.

Flagged phrases:

- "handle errors appropriately"
- "follow best practices"
- "as needed"
- "when necessary" / "when appropriate"
- "make sure to"

Replace them with a concrete step, or delete them.

See [Start from real expertise](https://agentskills.io/skill-creation/best-practices#start-from-real-expertise)
and [Add what the agent lacks](https://agentskills.io/skill-creation/best-practices#add-what-the-agent-lacks-omit-what-it-knows).

### Incorrect

```markdown
Handle errors appropriately and follow best practices as needed.
```

### Correct

```markdown
On non-200 responses, read the `error` field and retry once with backoff.
```

## `tool-menu`

Disallow "use A, B, or C" lists without a default.

Menus without a preferred choice leave the agent guessing. Name the
default tool, then mention alternatives only if needed.

See [Provide defaults, not menus](https://agentskills.io/skill-creation/best-practices#provide-defaults-not-menus).

### Incorrect

```markdown
Use jq, python, or node to parse the JSON.
```

### Correct

```markdown
Parse the JSON with `jq`. Use Python only if the document is larger than 10MB.
```

## `negation-steering`

In `SKILL.md`, pair "Do not / Don't / Never" with what to do instead.

A bare prohibition names the bad behaviour and stops there. Add
`Use`, `Prefer`, or `Instead` on the same line so the agent has a
positive target.

### Incorrect

```markdown
Do not invent ticket keys.
```

### Correct

```markdown
Do not invent ticket keys. Prefer searching Jira first, then ask the user.
```

## `time-sensitive`

Avoid dated guidance that will go stale.

Phrases like "before March 2025" or "until June 2026" age poorly in
skills. Move temporary rules to a deprecated section, or drop the date.

### Incorrect

```markdown
Until December 2026, always include the legacy header.
```

### Correct

```markdown
Include the legacy header while any service still reads it.
Check the compatibility matrix in references/headers.md when unsure.
```

## Related

Most prose rules report at most three diagnostics per file so one noisy
file does not flood the output.

Further reading:

- [Start from real expertise](https://agentskills.io/skill-creation/best-practices#start-from-real-expertise)
- [Provide defaults, not menus](https://agentskills.io/skill-creation/best-practices#provide-defaults-not-menus)
- [Match specificity to fragility](https://agentskills.io/skill-creation/best-practices#match-specificity-to-fragility)
