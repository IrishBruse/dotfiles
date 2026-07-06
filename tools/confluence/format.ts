import { hashBody } from "./local.ts";
import type { PageViewJson } from "./types.ts";

function yamlScalar(s: string): string {
  return JSON.stringify(s);
}

/** Extract Confluence space key from `_links.webui` (e.g. `/spaces/GCE1/pages/...`). */
export function spaceKeyFromWebui(webui: string | undefined): string {
  if (!webui) return "";
  const m = /\/spaces\/([^/]+)\//.exec(webui);
  return m?.[1] ?? "";
}

/** Frontmatter + markdown body for a pulled page. */
export function formatPageMarkdown(
  page: PageViewJson,
  body: string,
  opts: { url: string; spaceKey: string }
): string {
  const lines = ["---"];
  lines.push(`id: "${page.id}"`);
  if (page.title != null) lines.push(`title: ${yamlScalar(page.title)}`);
  if (page.parentId != null) lines.push(`parentId: "${page.parentId}"`);
  if (page.version?.number != null) {
    lines.push(`version: ${page.version.number}`);
  }
  if (opts.spaceKey) lines.push(`spaceKey: ${yamlScalar(opts.spaceKey)}`);
  lines.push(`url: ${opts.url}`);
  lines.push(`syncedHash: ${hashBody(body)}`);
  lines.push("---", "");
  return `${lines.join("\n")}\n${body}\n`;
}
