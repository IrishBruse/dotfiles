import { MAX_LINE } from "../core/shared.ts";
import { yamlSingleQuote } from "../core/fix-shared.ts";

const KEY_LINE = /^([A-Za-z0-9_.-]+):\s*(.*)$/;

function isKeyLine(line: string): boolean {
  return KEY_LINE.test(line);
}

function findWrapBreak(slice: string): { splitAt: number; nextAt: number } | null {
  const spaceAt = slice.lastIndexOf(" ");
  if (spaceAt > 0) {
    return { splitAt: spaceAt, nextAt: spaceAt + 1 };
  }
  return null;
}

function formatDescriptionLines(text: string): string[] {
  const quoted = yamlSingleQuote(text);
  const single = `description: ${quoted}`;
  if (single.length <= MAX_LINE) {
    return [single];
  }

  const prefix = "description: '";
  const indent = "  ";
  const lines: string[] = [];
  let remaining = text.replace(/'/g, "''");
  let first = true;

  while (remaining.length > 0) {
    const budget = first ? MAX_LINE - prefix.length : MAX_LINE - indent.length - 1;
    if (remaining.length <= budget) {
      lines.push(first ? `${prefix}${remaining}'` : `${indent}${remaining}'`);
      break;
    }

    const br = findWrapBreak(remaining.slice(0, budget + 1));
    if (!br) {
      lines.push(first ? `${prefix}${remaining}'` : `${indent}${remaining}'`);
      break;
    }

    lines.push(
      first
        ? `${prefix}${remaining.slice(0, br.splitAt)}`
        : `${indent}${remaining.slice(0, br.splitAt)}`
    );
    remaining = remaining.slice(br.nextAt);
    first = false;
  }

  return lines;
}

function collectDescription(
  lines: string[],
  start: number
): { text: string; end: number } {
  const first = lines[start] ?? "";
  const match = /^description:\s*(.*)$/.exec(first);
  if (!match) {
    return { text: "", end: start + 1 };
  }

  const rest = (match[1] ?? "").trim();
  let index = start + 1;

  if (rest === "") {
    const parts: string[] = [];
    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (line.trim() === "") {
        index++;
        continue;
      }
      const indentMatch = /^(\s+)(.*)$/.exec(line);
      if (!indentMatch) break;
      parts.push(indentMatch[2].trim());
      index++;
    }
    return {
      text: parts.join(" ").replace(/\s+/g, " ").trim(),
      end: index,
    };
  }

  if (/^[>|]/.test(rest)) {
    return { text: "", end: index };
  }

  if (rest.startsWith("'") || rest.startsWith('"')) {
    const quote = rest[0] as "'" | '"';
    if (rest.endsWith(quote) && rest.length > 1) {
      const inner = rest.slice(1, -1);
      return {
        text: quote === "'" ? inner.replace(/''/g, "'") : inner,
        end: index,
      };
    }

    const parts: string[] = [rest.slice(1)];
    while (index < lines.length) {
      const line = lines[index] ?? "";
      const close = line.indexOf(quote);
      if (close !== -1) {
        parts.push(line.slice(0, close));
        index++;
        break;
      }
      parts.push(line.trim());
      index++;
    }
    const joined = parts.join(" ").replace(/\s+/g, " ").trim();
    return {
      text: quote === "'" ? joined.replace(/''/g, "'") : joined,
      end: index,
    };
  }

  const parts = [rest];
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index++;
      continue;
    }
    if (isKeyLine(line)) break;
    parts.push(line.trim());
    index++;
  }

  return {
    text: parts.join(" ").replace(/\s+/g, " ").trim(),
    end: index,
  };
}

function shouldRewrite(lines: string[], start: number, end: number): boolean {
  if (end > start + 1) return true;

  const line = lines[start] ?? "";
  if (line.length > MAX_LINE) return true;

  const rest = line.replace(/^description:\s*/, "").trim();
  if (rest === "") return true;
  if (/^[>|]/.test(rest)) return false;

  return false;
}

/**
 * @skills/frontmatter-description
 * @skills/frontmatter-orphan
 */
export function fix(content: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return content;

  const lines = match[1].split("\n");
  const out: string[] = [];
  let index = 0;
  let changed = false;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!/^description:\s*/.test(line)) {
      out.push(line);
      index++;
      continue;
    }

    const { text, end } = collectDescription(lines, index);
    if (!shouldRewrite(lines, index, end)) {
      out.push(...lines.slice(index, end));
      index = end;
      continue;
    }

    const formatted = formatDescriptionLines(text);
    const original = lines.slice(index, end).join("\n");
    const updated = formatted.join("\n");
    if (updated !== original) {
      changed = true;
    }
    out.push(...formatted);
    index = end;
  }

  if (!changed) return content;

  const frontmatter = out.join("\n");
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}
