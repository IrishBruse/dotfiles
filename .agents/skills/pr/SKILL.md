---
name: pr
description: Automates the creation, updating, and previewing of Pull Requests while enforcing repository templates, Jira ticket integration, and conventional commit standards.
compatibility: gh cli, Jira mcp
---

# Steps

- Pull down the users currently assigned jira tickets with the mcp tool
  - Or use the user provided jira id in which case you can skip this and use the provided id.
- Run `git diff origin/main` to use with the description.
- Read the local PR template and use it.
- Create the PR with the title `NOVACORE-123 - <title>` and the body following the template.

# Output

Return the link to the pr template only unless there are issues.

If at any point you cant complete this task by using only the listed steps print the reason for failure.
Do not try and work around it.
