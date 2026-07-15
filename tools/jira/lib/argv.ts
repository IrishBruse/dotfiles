/**
 * Minimal argv flag parsing for jira subcommands.
 */

export type ParsedArgv = {
  positional: string[];
  flags: Map<string, string | boolean>;
  extras: string[];
};

/** Parse flags from argv slice after subcommand name. */
export function parseSubcommandArgv(argv: string[], startIndex: number): ParsedArgv {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  const extras: string[] = [];

  for (let i = startIndex; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg === "--") {
      extras.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq > 0) {
        flags.set(arg.slice(2, eq), arg.slice(eq + 1));
        continue;
      }
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags.set(name, next);
        i += 1;
      } else {
        flags.set(name, true);
      }
      continue;
    }

    if (arg.startsWith("-") && arg.length === 2) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags.set(arg.slice(1), next);
        i += 1;
      } else {
        flags.set(arg.slice(1), true);
      }
      continue;
    }

    positional.push(arg);
  }

  return { positional, flags, extras };
}

/** Read a string flag or return default. */
export function flagString(
  flags: Map<string, string | boolean>,
  name: string,
  fallback = ""
): string {
  const value = flags.get(name);
  if (value === undefined || value === true) return fallback;
  return String(value);
}

/** True when a boolean flag is present. */
export function flagBool(
  flags: Map<string, string | boolean>,
  name: string
): boolean {
  return flags.has(name);
}
