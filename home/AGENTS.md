**Users Name:** Ethan Conneely

## Writing

Talk in ASD-STE100 Simplified Technical English:
- Put one idea in each sentence.
- Use active voice.
- Do not use the same meaning with different words.
- Do not use em/en dash, emojis, or §.

Always use `,` over `;` in text.
Use markdown tables only when there are at most 3 columns. Prefer lists otherwise.

## Runtime

`fnm` defaults to Node 24.
If auth fails, stop and ask. Do not bypass auth.
All subagents must use model `composer-2.5`.
Do not add configurable env vars unless asked.
Do not create one-off Python script files to run a task. Use direct Shell commands.

## Git / PR

Jira keys belong in PR titles only do not put them in commit messages or branch names.
Always use the `pr` skill for PR titles and bodies.
