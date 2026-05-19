import { execSync } from "node:child_process";
import process from "node:process";

import type { InterpolationError } from "../errors.ts";
import { locationAt } from "../location.ts";

export const INLINE_COMMAND_MAX_LENGTH = 40;

/** Fenced blocks opened with ```!cmd ... body ... ``` */
const commandFencePattern = /```!([^\n]*)\n([\s\S]*?)```/g;

/** Inline `!cmd` (backticks, single-line command). */
const inlineCommandPattern = /`!([^`\n]+)`/g;

function runCommand(cmd: string): string {
  return execSync(cmd, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.env.SHELL ?? "/bin/sh",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function expandFencedBlocks(text: string): string {
  return text.replace(commandFencePattern, (_, cmd: string) => {
    const trimmed = cmd.trim();
    if (trimmed === "") {
      throw new Error("interpolate: empty command in ```! block");
    }
    const output = runCommand(trimmed);
    return `\`\`\`\n${output}\`\`\``;
  });
}

export type CommandExpandResult = {
  text: string;
  errors: InterpolationError[];
};

/** Run shell commands in ```! blocks and `!cmd` inline spans. */
export function expand(text: string): CommandExpandResult {
  const fenced = expandFencedBlocks(text);
  const errors: InterpolationError[] = [];
  const replacements: { index: number; length: number; output: string }[] = [];

  for (const match of fenced.matchAll(inlineCommandPattern)) {
    const cmd = match[1];
    const index = match.index;
    if (cmd === undefined || index === undefined) {
      continue;
    }

    const trimmed = cmd.trim();
    const { line, column } = locationAt(fenced, index);

    if (trimmed === "") {
      errors.push({ line, column, message: "empty inline command" });
      continue;
    }

    const output = runCommand(trimmed);
    if (output.length > INLINE_COMMAND_MAX_LENGTH) {
      errors.push({
        line,
        column,
        message: `inline command output exceeds ${INLINE_COMMAND_MAX_LENGTH} characters (${output.length})`,
      });
      continue;
    }

    replacements.push({ index, length: match[0].length, output });
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
