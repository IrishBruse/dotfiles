// --- Edit CONFIG (only source of settings) ---
export const CONFIG = {
  /** Host only, e.g. "your-org.atlassian.net" */
  site: "globalization-partners.atlassian.net",
  /** Your Atlassian account ID (Jira profile / issue JSON assignee.accountId) */
  meAccountId: "712020:b030f3e6-786d-46ed-94cd-df2ac4b68532",
  /** Board ID from Jira url */
  boardId: "691",
  /** JQL (put ORDER BY at the end; avoid `sprint in openSprints()` when boardId is set) */
  boardJql: "project = NOVACORE ORDER BY assignee, key",
  /** Clear existing *.md under me/, unassigned/, team/ before writing */
  clean: true,
} as const;
