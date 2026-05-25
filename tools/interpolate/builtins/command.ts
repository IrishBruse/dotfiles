import { execSync } from "node:child_process";
import process from "node:process";

import type { InterpolationError } from "../errors.ts";
import { locationAt } from "../location.ts";

export const INLINE_COMMAND_MAX_LENGTH = 40;

/** Fenced blocks opened with ```!cmd ... body ... ``` */
const commandFencePattern = /```!([^\n]*)\n([\s\S]*?)```/g;

/** Inline `!cmd` (backticks, single-line command; cmd must start with a letter). */
const inlineCommandPattern = /`!([a-zA-Z][^`\n]*)`/g;

function runCommand(cmd: string): string {
  return execSync(cmd, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.env.SHELL ?? "/bin/sh",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

/** So command stdout cannot close an outer markdown fence early. */
function escapeFenceMarkers(text: string): string {
  return text.replaceAll("```", "``\\`");
}

function expandFencedBlocks(text: string): string {
  return text.replace(commandFencePattern, (_, cmd: string) => {
    const trimmed = cmd.trim();
    if (trimmed === "") {
      throw new Error("interpolate: empty command in ```! block");
    }
    const output = escapeFenceMarkers(runCommand(trimmed));
    return `\`\`\`\n${output}\`\`\``;
  });
}

export type CommandExpandResult = {
  text: string;
  errors: InterpolationError[];
};

function expandInlineInSegment(
  segment: string,
  segmentStart: number,
  errors: InterpolationError[],
  replacements: { index: number; length: number; output: string }[]
): void {
  for (const match of segment.matchAll(inlineCommandPattern)) {
    const cmd = match[1];
    const index = match.index;
    if (cmd === undefined || index === undefined) {
      continue;
    }

    const trimmed = cmd.trim();
    const { line, column } = locationAt(segment, index);

    if (trimmed === "") {
      errors.push({ line, column, message: "empty inline command" });
      continue;
    }

    const output = runCommand(trimmed);
    if (output.length > INLINE_COMMAND_MAX_LENGTH) {
      errors.push({
        line,
        column,
        message: `inline command output exceeds ${INLINE_COMMAND_MAX_LENGTH} characters (${output.length})`
      });
      continue;
    }

    replacements.push({
      index: segmentStart + index,
      length: match[0].length,
      output
    });
  }
}

const PLAIN_FENCE_RE = /(```[\s\S]*?```)/g;

/** Run shell commands in ```! blocks and `!cmd` inline spans (inline skipped inside plain fences). */
export function expand(text: string): CommandExpandResult {
  const fenced = expandFencedBlocks(text);
  const errors: InterpolationError[] = [];
  const replacements: { index: number; length: number; output: string }[] = [];

  let offset = 0;
  for (const part of fenced.split(PLAIN_FENCE_RE)) {
    if (part.startsWith("```")) {
      offset += part.length;
      continue;
    }
    expandInlineInSegment(part, offset, errors, replacements);
    offset += part.length;
  }

  if (errors.length > 0) {
    return { text, errors };
  }

  let out = fenced;
  for (const r of [...replacements].reverse()) {
    out = out.slice(0, r.index) + r.output + out.slice(r.index + r.length);
  }

  return { text: out, errors: [] };
}
