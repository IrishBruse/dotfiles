# Local Draft

Save drafts under `~/jira/<type>/` (same layout as `jira pull`).

## Persist rules

- Write the local draft before the **Jira Write Approval Gate**.
- Re-read the file at the start of the create or update step. The file wins over chat if they differ.
- If the user edits the file during review, use the file content for the create or edit write.
- For existing tickets, prefer edit-the-file then publish over a remote-only summary/description edit.
