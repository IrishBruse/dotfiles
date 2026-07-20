/** Rule codes with a registered auto-fix in engine/fix.ts. */
export const FIXABLE_RULE_CODES = new Set([
  "description-block",
  "em-dash",
  "frontmatter-description",
  "frontmatter-orphan",
  "long-line",
  "nested-reference",
  "non-ascii",
  "prose-semicolon",
  "reference-toc",
]);

export function isFixableRule(code: string): boolean {
  return FIXABLE_RULE_CODES.has(code);
}
