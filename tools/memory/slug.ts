const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_WORDS = 4;

/**
 * Validate a memory id (kebab-case, at most four hyphen-separated words).
 */
export function parseSlug(raw: string): string {
  const slug = raw.trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `invalid id "${raw}": use lowercase letters, digits, and hyphens only`
    );
  }

  const words = slug.split("-");
  if (words.length > MAX_SLUG_WORDS) {
    throw new Error(
      `invalid id "${raw}": at most ${MAX_SLUG_WORDS} words separated by hyphens`
    );
  }

  return slug;
}
