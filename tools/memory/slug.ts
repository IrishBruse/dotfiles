const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validate a memory id (kebab-case).
 */
export function parseSlug(raw: string): string {
  const slug = raw.trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Id "${raw}" must use lowercase letters, digits, and hyphens only.`
    );
  }

  return slug;
}
