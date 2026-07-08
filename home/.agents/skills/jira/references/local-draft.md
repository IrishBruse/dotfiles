# Local Draft

Save drafts using workspace artifact conventions.

## Persist rules

- Write the local draft before the **Jira Write Approval Gate** in `SKILL.md`.
- Re-read the file at the start of the create or update step. The file wins over chat if they differ.
- If the user edits the file during review, use the file content for `createJiraIssue` or `editJiraIssue`.
