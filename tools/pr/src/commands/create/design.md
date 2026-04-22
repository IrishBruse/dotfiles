# Create command — design

This document describes how **`pr create`** fits the wider CLI and how core vs **work** overlays are separated.

## Relationship to other commands

- **`pr` with no subcommand** (`infer.ts`) calls **`runCreate`** when **no open PR** exists for the current branch (`gh pr view --json number` fails or returns no usable PR). Otherwise it runs **`update`**.
- **`pr create`** is the **explicit** entry for the same workflow when you want to name the subcommand explicitly (same behavior as inferred create; **no extra positional arguments**).

## CLI contract

- **Form:** `pr create` — no ticket or Jira arguments. Any work **org title policy** is controlled only by environment (see below), not argv.

## Execution: core vs work

| `PR_TITLE_JIRA_KEY` | What runs |
|---------------------|-----------|
| **Unset** | **`loadCreateAgentPrompt`** reads **`prompts/create.md`** only — no `prompts/work/` files, no calls into **`src/work/jiraTitlePolicy.ts`** beyond **`isJiraTitlePolicyEnabled()`** (cheap env check). |
| **Set** | Same loader appends **`prompts/work/create-appendix.md`** (substituted **`{{JIRA_PROJECT_KEY}}`**). All Jira-board skill and title-shape rules live in that appendix file, not in core markdown. |

Code entry: **`createPrompt.ts`** exposes **`loadCreateBasePrompt`** (core only, useful for tests) and **`loadCreateAgentPrompt`** (conditional append).

## Work-only Jira title policy (global toggle)

Personal use: leave **`PR_TITLE_JIRA_KEY`** unset — the create prompt never loads the work appendix.

Work use: set the env var (e.g. **`direnv`**). The appendix instructs the agent to use the **jira-board** Agent Skill and produce **`KEY-<digits>`** titles. **`src/work/jiraTitlePolicy.ts`** only gates loading; prompt copy for create lives in **`prompts/work/create-appendix.md`** so it is visibly separate from core.

### Inferring the ticket (work)

When the appendix is present, the agent invokes **jira-board**, matches branch / diff to assigned work, and fails clearly if no ticket fits.

## Prompt files

| File | Role |
|------|------|
| **`prompts/create.md`** | Personal/core: **`gh`**, diff, template, generic title, JSON fence — **no** org Jira rules. |
| **`prompts/work/create-appendix.md`** | Loaded **only** when **`isJiraTitlePolicyEnabled()`** — Jira title policy + jira-board skill + examples using **`{{JIRA_PROJECT_KEY}}`** substitution. |

## Intended runtime (prompt contract)

1. Compose via **`loadCreateAgentPrompt`** (core ± work appendix).
2. Run **`agent`** with that string (e.g. **`--print`**).
3. Parse the **last** **`json`** fence for **`title`** and **`body`**.
4. Optionally validate **title** against **`KEY-<digits>`** when **`PR_TITLE_JIRA_KEY`** is set.
5. Render markdown in the terminal; on **Enter** run **`gh pr create`**, on **Esc** cancel.

## Current implementation status

**`runCreate`** builds the composed prompt via **`loadCreateAgentPrompt`** and prints a **stub** line (length) to **`stderr`**; it does **not** invoke **`agent`** or **`gh`** yet.

## Related files

| File | Purpose |
|------|---------|
| `src/commands/create/index.ts` | CLI entry and stub orchestration |
| `src/commands/create/createPrompt.ts` | Core vs work composition |
| `src/work/jiraTitlePolicy.ts` | **`isJiraTitlePolicyEnabled`** (shared gate; review uses **`buildWorkJiraTitleSection`** from the same module) |
| `src/infer.ts` | Calls **`runCreate`** when inference chooses “no open PR” |
| `prompts/create.md` | Core agent instructions |
| `prompts/work/create-appendix.md` | Work-only appendix |

## Notes

- Create does **not** prepend **`shared.md`**; only **`review`** composes **`shared.md`** + **`review.md`**.
