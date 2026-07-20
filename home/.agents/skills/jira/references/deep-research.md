# Deep Research

Use when broad, ambiguous, related-work-sensitive, or multi-system inputs need parallel specialist research before route selection.

Launch multiple `generalPurpose` subagents in parallel. Give each subagent one research lane. Use only the lanes that match the input and the risk:

- **Jira Search**: related work, duplicates, parent Initiative or Epic candidates, issue type precedents, ownership, Feature Team, labels, ticket hygiene.
- **Confluence Search**: decisions, plans, requirements, RFCs, architecture pages, meeting notes, product context.
- **GitHub Search**: related PRs, branches, repos, issues, implementation clues, ownership signals, recent similar changes.
- **Local Workspace Search**: related drafts, specs, context files, previous agent output, cloned repo evidence.

Each specialist subagent must:

- Receive the normalized user input plus relevant Jira keys, repo names, PR links, branch names, feature names, actors, suspected parent Initiative or Epic, and the specific research lane.
- Return concise findings only for its lane.
- Include source references with keys, titles, URLs, file paths, or commands used where available.
- Report confidence, duplicate or parentage risks, ticket hygiene findings, and open questions relevant to its lane.

Use the specialist findings as evidence for the investigation report.
If a lane is blocked by credentials or access, continue with available context and surface the gap in the report.

## Prompt Shape

Use this shape for each lane:

```text
Research lane: <Jira Search | Confluence Search | GitHub Search | Local Workspace Search>

Input:
<normalized user input, keys, repos, PRs, branches, feature names, actors, parent candidates>

Task:
Search only this lane for context that affects Jira routing, duplicate risk, parentage, ownership, issue type, breakdown need, and ticket hygiene.

Return:
- Findings
- Source references
- Risks or duplicates
- Parentage or ownership signals
- Open questions

Mutation rule:
Do not create, update, publish, reparent, close, comment on, or otherwise mutate anything.
```
