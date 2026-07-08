const INLINE_LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g;
const REF_LINK_DEF_RE = /^\[[^\]]+\]:\s+<?([^>\s]+)>?/gm;

function isRelativeMdHref(href: string): boolean {
  const target = href.trim();
  if (!target || target.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false;
  return /\.md(?:[#?].*)?$/i.test(target);
}

/** Relative markdown link targets under `confluence/`. */
export type RelativeMdLink = {
  href: string;
  index: number;
  line: number;
  column: number;
};

function lineColumnAt(source: string, index: number): { line: number; column: number } {
  const prefix = source.slice(0, index);
  const lines = prefix.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/** Find relative `.md` links in markdown (inline and reference-style). */
export function findRelativeMdLinks(source: string): RelativeMdLink[] {
  const hits: RelativeMdLink[] = [];

  for (const m of source.matchAll(INLINE_LINK_RE)) {
    const href = m[1];
    if (!href || !isRelativeMdHref(href)) continue;
    const index = m.index ?? 0;
    const pos = lineColumnAt(source, index);
    hits.push({ href, index, line: pos.line, column: pos.column });
  }

  for (const m of source.matchAll(REF_LINK_DEF_RE)) {
    const href = m[1];
    if (!href || !isRelativeMdHref(href)) continue;
    const index = m.index ?? 0;
    const pos = lineColumnAt(source, index);
    hits.push({ href, index, line: pos.line, column: pos.column });
  }

  return hits;
}

/** Throw when markdown still contains relative `.md` links. */
export function assertNoRelativeMdLinks(
  source: string,
  label: string
): void {
  const hits = findRelativeMdLinks(source);
  if (hits.length === 0) return;
  const details = hits
    .slice(0, 8)
    .map((h) => `${label}:${h.line}:${h.column} ${h.href}`)
    .join("\n");
  const more =
    hits.length > 8 ? `\n... and ${hits.length - 8} more` : "";
  throw new Error(
    `relative .md links are not allowed; use full Confluence or Jira URLs\n${details}${more}`
  );
}
