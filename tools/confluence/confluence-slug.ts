/** File / folder segment derived from a Confluence title (matches clone + link targets). */
export function slugifyConfluenceTitle(title: string): string {
  return title
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
