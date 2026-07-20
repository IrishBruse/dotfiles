export interface SkillsCommandOptions {
  cursorBuiltin: boolean;
  positional: string[];
}

export function parseSkillsArgs(
  argv: string[]
): SkillsCommandOptions | "help" | "error" {
  let cursorBuiltin = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") return "help";
    if (arg === "--cursor-builtin") {
      cursorBuiltin = true;
      continue;
    }
    if (arg.startsWith("-")) return "error";
    positional.push(arg);
  }

  return { cursorBuiltin, positional };
}

export interface LintCommandOptions extends SkillsCommandOptions {
  fix: boolean;
}

export function parseLintArgs(
  argv: string[]
): LintCommandOptions | "help" | "error" {
  let fix = false;
  let cursorBuiltin = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") return "help";
    if (arg === "--fix") {
      fix = true;
      continue;
    }
    if (arg === "--cursor-builtin") {
      cursorBuiltin = true;
      continue;
    }
    if (arg.startsWith("-")) return "error";
    positional.push(arg);
  }

  return { fix, cursorBuiltin, positional };
}
