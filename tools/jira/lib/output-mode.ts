/** Human-readable or structured JSON output for agent consumption. */
export type OutputMode = "human" | "json";

/** Options passed from main into subcommands. */
export type CommandOptions = {
  outputMode: OutputMode;
};

/** Uniform CLI result envelope (agent-browser style). */
export type JiraResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  code?: string;
};

/** Default command options for tests and internal callers. */
export const HUMAN_OUTPUT: CommandOptions = { outputMode: "human" };

export function isJsonMode(options: CommandOptions = HUMAN_OUTPUT): boolean {
  return options.outputMode === "json";
}

/** Remove global `--json` flags from argv before subcommand dispatch. */
export function parseGlobalFlags(argv: string[]): {
  argv: string[];
  outputMode: OutputMode;
} {
  const cleaned: string[] = [];
  let json = false;
  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    cleaned.push(arg);
  }
  return {
    argv: cleaned,
    outputMode: json ? "json" : "human"
  };
}
