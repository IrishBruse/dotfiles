# Budget

Rules that keep `SKILL.md` small enough to load every turn.
Only `SKILL.md` is checked. There are no auto-fixers.

When these fire, move detail behind a linked reference file (or into a
sibling skill) rather than packing more into the main body.

See [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
and
[Structure large skills with progressive disclosure](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure).

## `skill-length`

Cap `SKILL.md` at 500 lines.

A skill that grows past this usually has reference material still sitting
in the main file. Split it out and leave a pointer that says when to load it.

Spec: [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
("Keep your main `SKILL.md` under 500 lines").

### Incorrect

A 520-line `SKILL.md` with long API tables inline.

### Correct

Keep the procedure in `SKILL.md`. Move the tables to
`references/api-tables.md` and link them when the agent needs them.

## `skill-token-budget`

Warn when the body (after frontmatter) exceeds ~5000 estimated tokens.

Tokens are estimated as `ceil(chars / 4)`. This is a soft budget for
context cost. Prefer progressive disclosure over compressing every word
into the main file.

Spec: [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
("Instructions (< 5000 tokens recommended)").

### Incorrect

A body that dumps every edge case into `SKILL.md`.

### Correct

Inline the steps every run needs.
Push rare branches behind pointers such as:

```markdown
If the API returns non-200, read [API errors](references/api-errors.md).
```

## Related

Lint only counts size.
Choosing *what* to disclose is authoring judgment. See `writing-great-skills`
for progressive disclosure and information hierarchy.

Further reading:

- [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
- [Structure large skills with progressive disclosure](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)
- [Spending context wisely](https://agentskills.io/skill-creation/best-practices#spending-context-wisely)
