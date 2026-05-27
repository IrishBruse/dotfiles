# machine

### cwd

`{{cwd}}`

Current working directory.

### home

`{{home}}`

User home directory.

### user

`{{user}}`

Login user name.

### branch

`{{branch}}`

Current git branch (`git branch --show-current` in `{{cwd}}`).

### prTemplate

`{{prTemplate}}`

First repo PR template found (`.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or `docs/pull_request_template.md`), or `(none)`.

# environment

### env:HOME

`{{env:HOME}}`

HOME environment variable.

### env:SHELL

`{{env:SHELL}}`

SHELL environment variable.

# line conditions

### ?varname:

Prefix a line with `?varname:` (or `?env:NAME:`). When the variable or environment value is truthy, the rest of the line is kept; otherwise the whole line is dropped. Empty remainder yields a blank line when kept.

`?work:` is a shortcut for `?env:WORK:` (work policy / NOVACORE title rules).

Example:

```
?work: Title must start with NOVACORE-<digits>.
```

Truthy: non-empty, not `0`, not `false`. Set `WORK=true` for work policy lines.

# commands

### !command

Fenced command block on the opener line (body between fences is ignored). Stdout replaces the block; `langid` is kept when set. Use ` ```!cmd ` or ` ```langid !cmd ` (space required before `!` when `langid` is present).

Examples (input):

\`\`\`!echo test

\`\`\`

\`\`\`diff !git diff HEAD~1

\`\`\`

Example (output from `interpolate builtins`):

```
echo test

```

```
diff output here
```

### inline !command

Wrap a one-line shell command in backticks with a leading exclamation mark (command must start with a letter, e.g. `!echo hi`). Output must be at most 40 characters or interpolation fails.

Live example: `!echo test`
