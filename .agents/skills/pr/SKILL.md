---
name: pr
description: Automates the creation, updating, and previewing of Pull Requests while enforcing repository templates, Jira ticket integration, and conventional commit standards.
compatibility: gh cli, Jira mcp
---

# Requirements

- Jira MCP access **Fail** if missing

# Steps

- Pull down the users currently assigned jira tickets with the mcp tool or use the provided NOVACORE-... provided by the user
- Run `git diff origin/main` to use with the description.
- Read and use the local PR template if it exists.
- Do any validation required
  - Run only the relevent tests
  - Run any security checks (e.g. Snyk)
  - Make sure linting is correct
- Create the PR with the title `NOVACORE-123 - <title>` and the body following the template.

# Output

Return the link to the pr only unless there are issues.

If at any point you cant complete this task by using only the listed steps print the reason for failure.
Do not try and work around it.
