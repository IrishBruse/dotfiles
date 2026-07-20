# Frontmatter

Rules for the YAML block at the top of `SKILL.md`.
Other markdown files are skipped.

These rules keep the skill discoverable: a valid `name`, a parseable
`description`, and wording that helps the agent decide when to fire.
See the [name](https://agentskills.io/specification#name-field) and
[description](https://agentskills.io/specification#description-field) fields
in the Agent Skills specification.

## `frontmatter-name`

Require a valid `name` field.

`name` must be present, non-empty, at most 64 characters, match
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, and must not use reserved words (`anthropic`,
`claude`) or embed XML tags.

Spec: [name field](https://agentskills.io/specification#name-field).

### Incorrect

```yaml
---
name: My Skill
description: Does a thing
---
```

```yaml
---
name: claude-helper
description: Does a thing
---
```

### Correct

```yaml
---
name: deploy-preview
description: Deploy a preview environment. Use when the user asks to ship a preview.
---
```

## `name-folder-mismatch`

Require `name` to match the skill folder.

The folder that contains `SKILL.md` is the source of truth for the skill's
identity. A mismatched `name` breaks discovery and makes links confusing.

Spec: [name field](https://agentskills.io/specification#name-field)
("Must match the parent directory name").

### Incorrect

Folder `deploy-preview/`, but:

```yaml
---
name: preview-deploy
description: Deploy a preview environment. Use when shipping a preview.
---
```

### Correct

```yaml
---
name: deploy-preview
description: Deploy a preview environment. Use when shipping a preview.
---
```

## `vague-skill-name`

Disallow generic skill names.

Names like `helper`, `utils`, `tools`, `documents`, `data`, and `files`
do not tell anyone (or the agent) what the skill is for.

### Incorrect

```yaml
---
name: helper
description: Helps with tasks. Use when the user needs help.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: Rotate API secrets in the vault. Use when credentials need rotation.
---
```

## `frontmatter-description`

Require a non-empty, well-formed `description`.

An indented continuation after `description:` (instead of a quoted string)
or an empty value is an error. `--fix` can merge stray lines into a quoted
string and wrap long values.

Spec: [description field](https://agentskills.io/specification#description-field).

### Incorrect

```yaml
---
name: rotate-secrets
description:
  Rotate API secrets in the vault.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: 'Rotate API secrets in the vault. Use when credentials need rotation.'
---
```

## `frontmatter-orphan`

Disallow frontmatter lines that are not `key: value`.

Orphan lines usually come from a broken multi-line `description`. They make
the YAML invalid for parsers that expect a flat map. `--fix` merges them
back into `description`.

### Incorrect

```yaml
---
name: rotate-secrets
description: Rotate API secrets.
Use when credentials need rotation.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: 'Rotate API secrets. Use when credentials need rotation.'
---
```

## `description-block`

Disallow YAML block scalars for `description`.

`>` and `|` make descriptions harder to scan in editors and in the skill
index. Prefer a quoted string. `--fix` rewrites the block to `"..."`.

### Incorrect

```yaml
---
name: rotate-secrets
description: >
  Rotate API secrets in the vault.
  Use when credentials need rotation.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: "Rotate API secrets in the vault. Use when credentials need rotation."
---
```

## `description-triggers`

Require a trigger phrase on model-invoked skills.

If the skill can be chosen by the model (no `disable-model-invocation: true`),
the description should include `use when` or `use for` so the agent knows
when to fire it.

See [Writing effective descriptions](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)
("Use this skill when...").

### Incorrect

```yaml
---
name: rotate-secrets
description: Rotates API secrets in the vault.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: Rotate API secrets in the vault. Use when credentials need rotation.
---
```

User-invoked skills (`disable-model-invocation: true`) skip this rule.

## `description-voice`

Disallow second-person marketing voice in the description.

Phrases like "I can help" or "You can use this" waste tokens and do not
improve triggering. Prefer imperative phrasing about what the skill does
and when to use it.

See [Writing effective descriptions](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions).

### Incorrect

```yaml
---
name: rotate-secrets
description: I can help you rotate secrets. Use when credentials need rotation.
---
```

### Correct

```yaml
---
name: rotate-secrets
description: Rotate API secrets in the vault. Use when credentials need rotation.
---
```

## Related

Constants live in `frontmatter-fields.ts`
(`MAX_NAME_LENGTH` 64, `MAX_DESCRIPTION_LENGTH` 1024).

Further reading:

- [name field](https://agentskills.io/specification#name-field)
- [description field](https://agentskills.io/specification#description-field)
- [Writing effective descriptions](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)
- [Testing whether a description triggers](https://agentskills.io/skill-creation/optimizing-descriptions#testing-whether-a-description-triggers)
