/** Parse ticket key or browse URL into a Jira issue key. */

const JIRA_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/;
const JIRA_KEY_LOOSE_RE = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;
/** `/browse/KEY-1` anywhere in the URL (cloud paths vary). */
const JIRA_URL_BROWSE_RE = /\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)/i;

export function parseJiraKey(input: string): string | null {
  const trimmed = input.trim();
  if (JIRA_KEY_RE.test(trimmed)) return trimmed;
  if (JIRA_KEY_LOOSE_RE.test(trimmed)) return trimmed.toUpperCase();
  const urlMatch = trimmed.match(JIRA_URL_BROWSE_RE);
  if (urlMatch) return urlMatch[1]!.toUpperCase();
  return null;
}
