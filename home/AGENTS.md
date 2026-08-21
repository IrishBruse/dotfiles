**Users Name:** Ethan Conneely

## Writing

**ALWAYS** talk in ASD-STE100 Simplified Technical English.
Use markdown tables when the table will not be wide. Prefer lists otherwise.

## Runtime

`fnm` defaults to Node 24.
If auth or a required tool fails, stop and ask. Do not bypass auth or switch to a substitute tool.
Prefer `composer-2.5` for subagents model if possible.
Do not add configurable env vars unless asked.
Do not create one-off Python script files to run a task. Use direct Shell commands.
Do not look at transcripts just do the work fresh.

Put temp file into the local `.tmp/` instead of global `/tmp`

## Git / PR

Always use the `pr` skill for PR titles and bodies.

## Code

Adhear to Locality of Behavior when writting code.