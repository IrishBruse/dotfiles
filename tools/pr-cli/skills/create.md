# Requirements

- Jira MCP access **Fail** if missing

# Steps

- Pull down the users currently assigned jira tickets with the mcp tool or use the provided NOVACORE-... provided by the user
- Run `git diff origin/main` to use with the description.
- Read and use the local PR template if it exists.
- Create the PR with the title `NOVACORE-123 - <title>` and the body following the template.

# Output

Return the link to the PR only unless there are issues.
