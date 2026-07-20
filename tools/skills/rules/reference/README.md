# Reference

Rules for linked reference files, scripts, and how `SKILL.md` points at them.

Skill bodies stay short by pushing detail into `references/`.
These rules keep that hand-off reliable: every reference is linked,
every link resolves, and pointers say *when* to load the file.

See [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure),
[File references](https://agentskills.io/specification#file-references), and
[Structure large skills with progressive disclosure](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure).

Most rules skip `SKILL.md` itself (except `orphan-reference`,
`vague-pointer`, `broken-link`, and `missing-script`).
Link and script checks need the full skill tree (`LintContext`).

## `orphan-reference`

Require every `references/*.md` file to be linked from skill markdown.

An unlinked reference file is dead weight. Either link it from `SKILL.md`
(or another skill markdown file that is itself reachable), or delete it.

### Incorrect

`references/api-errors.md` exists, but nothing links to it.

### Correct

```markdown
If the API returns non-200, read [API errors](references/api-errors.md).
```

## `vague-pointer`

Require specific, triggered pointers to reference material.

"See references" or "for more details" without a file name or an if/when
trigger does not tell the agent what to load. Link a concrete file and
state when it applies.

See
[Structure large skills with progressive disclosure](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)
("Read `references/api-errors.md` if the API returns a non-200 status code").

### Incorrect

```markdown
See references for more details.
```

### Correct

```markdown
If the API returns non-200, read [API errors](references/api-errors.md).
```

## `nested-reference`

Disallow reference files linking to other reference files.

Reference material should be a leaf the agent loads from `SKILL.md`,
not a second graph of docs. Nested `.md` links become backticks.
Links to `SKILL.md` are left alone. `--fix` rewrites the rest.

Spec: [File references](https://agentskills.io/specification#file-references)
("Keep file references one level deep from `SKILL.md`").

### Incorrect

In `references/overview.md`:

```markdown
See [errors](api-errors.md) for status codes.
```

### Correct

```markdown
See `api-errors.md` for status codes.
```

Or point from `SKILL.md` instead:

```markdown
For status codes, read [API errors](references/api-errors.md).
```

## `reference-toc`

Require a contents list on long reference files.

Files longer than 100 lines need a `## Contents` section in the first
30 lines so the agent can jump to the right heading. `--fix` inserts one
from the existing `##` headings.

### Incorrect

A 120-line reference file that starts straight into `## Overview`.

### Correct

```markdown
## Contents

- [Overview](#overview)
- [Error codes](#error-codes)

## Overview

...
```

## `skill-backlink`

Disallow reference files pointing back at `SKILL.md`.

Reference files are loaded *from* the skill. Linking or saying
"see SKILL.md" sends the agent in a circle. Keep the back-pointer out.

### Incorrect

In `references/api-errors.md`:

```markdown
See `SKILL.md` for the main procedure.
```

### Correct

Describe the error material on its own. The skill already pointed here.

## `broken-link`

Require relative markdown and script links to resolve under the skill root.

A link that points nowhere wastes a turn. This is an error.

### Incorrect

```markdown
Read [setup](references/missing.md).
```

### Correct

```markdown
Read [setup](references/setup.md).
```

## `missing-script`

Require `scripts/...` paths mentioned in prose to exist on disk.

If the skill tells the agent to run a script, that file must be present
in the skill folder.

See [scripts/](https://agentskills.io/specification#scripts) and
[Using scripts in skills](https://agentskills.io/skill-creation/using-scripts).

### Incorrect

```markdown
Run `scripts/sync.sh` after editing the board.
```

(when `scripts/sync.sh` does not exist)

### Correct

Ship `scripts/sync.sh` with the skill, or remove the reference.

## Related

Lint checks link shape and path existence.
It does not decide whether content should be split across files, or
whether a procedure belongs in `scripts/` versus inline steps.

Further reading:

- [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
- [File references](https://agentskills.io/specification#file-references)
- [references/](https://agentskills.io/specification#references)
- [Structure large skills with progressive disclosure](https://agentskills.io/skill-creation/best-practices#structure-large-skills-with-progressive-disclosure)
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)
- [Bundling reusable scripts](https://agentskills.io/skill-creation/best-practices#bundling-reusable-scripts)
