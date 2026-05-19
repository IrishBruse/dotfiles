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

Wrap a one-line shell command in backticks with a leading exclamation mark. Output must be at most 40 characters or interpolation fails.

Live example: `!echo test`
