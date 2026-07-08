# Local Draft

Save drafts using workspace artifact conventions.

## Story paths

Nest Story drafts and pulled tickets under the parent epic folder:

`jira/story/<parent title - NOVACORE-XXXXX>/<story title - NOVACORE-YYYYY>.md`

Before Jira create (no key yet), use the draft title for the filename:

`jira/story/<parent title - NOVACORE-XXXXX>/<story title>.md`

Resolve the parent epic key and title before writing the draft.
When the parent epic is unknown, complete the parent epic gate in [`story/story.md`](story/story.md) first.
Stories without a parent epic stay at `jira/story/<story title - NOVACORE-YYYYY>.md`.

## Persist rules

- Write the local draft before the **Jira Write Approval Gate** in `SKILL.md`.
- Re-read the file at the start of the create or update step. The file wins over chat if they differ.
- If the user edits the file during review, use the file content for `createJiraIssue` or `editJiraIssue`.
