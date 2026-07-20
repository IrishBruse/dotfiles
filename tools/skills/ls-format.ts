import process from "node:process";

import type { SkillDisplay, SkillDisplayField } from "./frontmatter.ts";
import { paintStdout } from "./lint/color.ts";

function formatFieldValue(field: SkillDisplayField): string {
  if (!field.valueRole) return field.value;
  return paintStdout(field.valueRole, field.value);
}

export function terminalWidth(): number {
  const columns = process.stdout.columns;
  return columns && columns > 0 ? columns : 80;
}

export function wrapText(text: string, width: number, indent: string): string[] {
  if (text.length === 0) return [];

  const available = Math.max(width - indent.length, 8);
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > available && current) {
      lines.push(`${indent}${current}`);
      current = word;
      continue;
    }
    current = next;
  }

  if (current) {
    lines.push(`${indent}${current}`);
  }

  return lines;
}

function formatSkillHeading(
  skillName: string,
  headingTags: SkillDisplay["headingTags"]
): string {
  const name = paintStdout("ok", skillName);
  if (headingTags.length === 0) return name;

  const tags = headingTags.map((tag) => {
    if (tag.keyOnly) {
      return paintStdout(tag.valueRole ?? "dim", tag.key);
    }
    const key = paintStdout("label", tag.key);
    const value = paintStdout(tag.valueRole ?? "dim", tag.value);
    return `${key} ${value}`;
  });
  return `${name} ${tags.join(" ")}`;
}

export function formatSkillLines(
  display: SkillDisplay,
  skillName: string,
  width = terminalWidth()
): string[] {
  const lines: string[] = [formatSkillHeading(skillName, display.headingTags)];

  if (display.fields.length > 0) {
    const keyWidth = Math.max(...display.fields.map((field) => field.key.length));
    for (const field of display.fields) {
      lines.push(
        `  ${paintStdout("label", field.key.padEnd(keyWidth))}  ${formatFieldValue(field)}`
      );
    }
  }

  if (display.description) {
    for (const line of wrapText(display.description, width, "")) {
      lines.push(paintStdout("dim", line));
    }
  }

  return lines;
}
