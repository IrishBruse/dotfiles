# Jira Auto

Use when the user invokes `/jira auto ...`.
Auto mode is explicit consent to skip user gates and proceed with the agent's best judgment.

## Invocation

Auto mode applies when the user message includes `/jira auto` before the rest of the input.

Examples:

- `/jira auto add observability for shell bootstrap failures`
- `/jira auto story payroll admin can review sync failures before retrying`
- `/jira auto update NOVACORE-34567 to match the current story template`
- `/jira auto breakdown NOVACORE-23456`

Strip `auto` from the invocation, then follow the normal router or the named subcommand route.

## Gate Overrides

When auto mode is active, override the normal skill gates below.
State assumptions in chat when the best guess is uncertain.

| Normal gate | Auto behavior |
|-------------|---------------|
| **Required Route Prompt** | Skip `AskQuestion`. Follow the strongest recommendation immediately. |
| **Jira Write Approval Gate** | Skip `AskQuestion`. State the planned change in chat, then perform the write in the same turn. |
| **Stop Gates** | Resolve from research. Prefer update or link over duplicate create. |
| Parentage / Feature Team asks | Pick the strongest candidate from Jira search, board context, or parent issue. Proceed without parent when none is found. |
| Title selection | Pick the strongest title from investigation context. State it in chat. |
| `clarify-vague.md` | Draft with available context. Mark unknowns as `TBD` or open questions in the ticket. |
| Breakdown stop gates | Complete the breakdown and create the recommended rows without confirmation. |
| Use-case agreement gates | Proceed with the best-guess use-case set. |
| Epic set confirmation | Create or draft the proposed epic set when the route requires it. |

## Still Required

- **Pull The Ticket Locally First**
- Research depth appropriate to the request
- `jira` CLI conventions from the parent skill
- Route writing rules and templates
- Stop on auth failure
- Do not create Spikes unless the user explicitly requests them, even in auto mode
- Do not invent measurable Initiative or Epic metrics. Flag missing metrics as open questions.

## Write Flow

For any remote Jira write in auto mode:

1. Open with `Auto mode: I will <create | update | reparent | transition | close | link | comment> <what>.`
2. List every field on its own line with `**Label:** value`.
3. For edits, show `before -> after` per changed field.
4. Note assumptions, duplicate handling, and unresolved gaps.
5. Perform the write without an approval `AskQuestion`.

## Completion

Reply with issue keys, browse URLs, local draft paths, assumptions, and remaining gaps.
