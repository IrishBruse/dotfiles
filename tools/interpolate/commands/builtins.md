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

Example:

```
?work: Title must start with NOVACORE-<digits>.
?env:PR_CLI_WORK: Same, keyed off the environment.
```

Truthy: non-empty, not `0`, not `false`. Pass `--var work=1` or set `PR_CLI_WORK=true`.

# commands

### !command

Write a fenced block with ! before the shell command on the opening line. The body is replaced with stdout (newlines preserved), and the opener becomes a plain fence.

Example (input):

\`\`\`!echo test

\`\`\`

Example (output from `interpolate builtins`):

```!echo test

```

### inline !command

Wrap a one-line shell command in backticks with a leading exclamation mark (command must start with a letter, e.g. `!echo hi`). Output must be at most 40 characters or interpolation fails.

Live example: `!echo test`
