import {
  frontmatterDelimiterStyle,
  frontmatterKeyStyle,
  frontmatterValueStyle,
  reset
} from "./colors.ts";
import { renderInline } from "./inline.ts";

export type FrontmatterEntry = { key: string; value: string };

/** Split YAML frontmatter from the document body when present at file start. */
export function splitFrontmatter(source: string): {
  frontmatter: string | null;
  body: string;
} {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(normalized);
  if (match === null) {
    return { frontmatter: null, body: source };
  }
  return { frontmatter: match[1], body: match[2] ?? "" };
}

function unquoteYamlScalar(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  try {
    return JSON.parse(trimmed) as string;
  } catch {
    return trimmed;
  }
}

/** Parse simple `key: value` frontmatter lines (Jira, Confluence, skill files). */
export function parseFrontmatterEntries(raw: string): FrontmatterEntry[] {
  const entries: FrontmatterEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(trimmed);
    if (match === null) continue;
    entries.push({
      key: match[1],
      value: unquoteYamlScalar(match[2])
    });
  }
  return entries;
}

function renderFrontmatterLine(key: string, value: string): string {
  return `${frontmatterKeyStyle}${key}:${reset} ${frontmatterValueStyle}${renderInline(value, frontmatterValueStyle)}${reset}`;
}

/** Render YAML frontmatter with delimiter, key, and value colors. */
export function renderFrontmatter(raw: string): string {
  const entries = parseFrontmatterEntries(raw);
  const lines = [
    `${frontmatterDelimiterStyle}---${reset}`,
    ...entries.map(({ key, value }) => renderFrontmatterLine(key, value)),
    `${frontmatterDelimiterStyle}---${reset}`
  ];
  return lines.join("\n");
}
