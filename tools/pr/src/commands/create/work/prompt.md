## Work — Jira title policy

Your org requires PR titles to start with **`{{JIRA_PROJECT_KEY}}-<digits>`**.

### Infer the ticket

Run the **jira-board** Agent Skill so you can read the current board and tickets assigned to the user. Use that context to infer **`{{JIRA_PROJECT_KEY}}-<digits>`** for the PR title from branch intent and assignments — **required** for this appendix; fail clearly if you cannot resolve a ticket (do not invent an id).

### Steps (in addition to the base `pr create` instructions above)

- Match this branch / diff to the correct ticket from the skill output and put that id in the title.
- PR title shape: `<KEY>-<digits> - <short title>` using project key **`{{JIRA_PROJECT_KEY}}`**.

Put the full title in **`Title.md`** and the description in **`Body.md`** (not JSON). Example title line inside **`Title.md`**:

`{{JIRA_PROJECT_KEY}}-123 - Short title`
