---
name: pr
description: Automates the creation, updating, and previewing of Pull Requests while enforcing repository templates, Jira ticket integration, and conventional commit standards.
compatibility: gh cli, Jira access,
---

# PR Tool

Automates the generation and management of Pull Requests to ensure they meet repository standards, include necessary tracking information (like Jira tickets), and follow expected commit conventions.

## Prerequisites

- Local git repository with an active branch and pushed commits.
- Access to read repository configuration files (e.g., `.github/pull_request_template.md`, `CONTRIBUTING.md`, `docs/`).
- GitHub CLI (`gh`) fail if not auth or not installed goto `#Failure`.
- Jira MCP connected if missing goto `#Failure`.
- On a fully pushed branch if not or on main goto `#Failure`.

# Steps

1. Pull down the users currently assigned jira tickets.
2. Read the diff from this branch and main fail if on main.
3. Review PR for issues dont examine code.
4. Read the local PR template and use it.
5. Create the pr with the title `NOVACORE-123 - title`

# Output

Return the link to the pr template only unless there are issues.

# Failure

Print the failure reason to the user and stop executing.
