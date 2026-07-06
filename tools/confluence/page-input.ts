const PAGE_ID_RE = /\/pages\/(\d+)/;
const BROWSE_KEY_RE = /\/browse\/([A-Z][A-Z0-9_]*-\d+)/i;

/** Parse a Confluence page id from a wiki URL. */
export function parsePageId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  const m = trimmed.match(PAGE_ID_RE);
  return m ? m[1]! : null;
}

/** Parse a Jira issue key from a browse URL or bare key. */
export function parseJiraKey(input: string): string | null {
  const trimmed = input.trim();
  const bare = /^[A-Z][A-Z0-9_]*-\d+$/i.exec(trimmed);
  if (bare) {
    return bare[0]!.toUpperCase();
  }
  const m = trimmed.match(BROWSE_KEY_RE);
  return m ? m[1]!.toUpperCase() : null;
}
