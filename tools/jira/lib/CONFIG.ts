// --- Edit CONFIG (only source of settings) ---
export const CONFIG = {
  /** Host only, e.g. "your-org.atlassian.net" */
  site: "your-org.atlassian.net",
  /** Your Atlassian account ID (Jira profile / issue JSON assignee.accountId) */
  meAccountId: "",
  /** Board ID from Jira url */
  boardId: "",
  /** Default Jira project key for create and types */
  project: "",
  /** JQL (put ORDER BY at the end; avoid `sprint in openSprints()` when boardId is set) */
  boardJql: "project = PROJ ORDER BY assignee, key",
  /** Custom field id for team label in pulled markdown (optional; set per site) */
  featureTeamField: "",
  /** Epic Link custom field id when parent is not in `parent` (classic Jira) */
  epicLinkField: "",
  /** Clear existing *.md under me/, unassigned/, team/ before writing */
  clean: true,
  /** Warn in jira doctor when board cache is older than this many days */
  boardCacheMaxAgeDays: 7
} as const;

/** Normalized project key from CONFIG.project. */
export function configuredProject(): string {
  return CONFIG.project.trim().toUpperCase();
}
