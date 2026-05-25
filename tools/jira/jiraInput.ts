/** Parse ticket key or browse URL into a Jira issue key. */

const JIRA_KEY_RE = /^[A-Z][A-Z0-9_]*-\d+$/;
/** `/browse/KEY-1` anywhere in the URL (cloud paths vary). */
const JIRA_URL_BROWSE_RE = /\/browse\/([A-Z][A-Z0-9_]*-\d+)/i;

export function parseJiraKey(input: string): string | null {
  if (JIRA_KEY_RE.test(input)) return input;
  const urlMatch = input.match(JIRA_URL_BROWSE_RE);
  if (urlMatch) return urlMatch[1];
  return null;
}
