/** If present in argv, only print the resolved agent prompt to stdout and exit. */
export const PRINT_PROMPT_FLAG = "--print-prompt";

/** Prefetch workspace and edit flow as usual, but do not run the Cursor agent. */
export const NO_AGENT_FLAG = "--no-agent";

/** Print the agent workspace path on stderr; otherwise the path is not logged. */
export const PRINT_WORKSPACE_DIR_FLAG = "--dir";

/** Skip the PR.md editor preview (`pr create` only). */
export const ASSUME_YES_SHORT_FLAG = "-y";
export const ASSUME_YES_LONG_FLAG = "--yes";

function takeFlag(args: string[], flag: string): { rest: string[]; on: boolean } {
  const on = args.includes(flag);
  const rest = on ? args.filter((a) => a !== flag) : args;
  return { rest, on };
}

export function takePrintPromptFlag(args: string[]): {
  rest: string[];
  printPrompt: boolean;
} {
  const { rest, on } = takeFlag(args, PRINT_PROMPT_FLAG);
  return { rest, printPrompt: on };
}

export function takeNoAgentFlag(args: string[]): {
  rest: string[];
  noAgent: boolean;
} {
  const { rest, on } = takeFlag(args, NO_AGENT_FLAG);
  return { rest, noAgent: on };
}

export function takePrintWorkspaceDirFlag(args: string[]): {
  rest: string[];
  printWorkspaceDir: boolean;
} {
  const { rest, on } = takeFlag(args, PRINT_WORKSPACE_DIR_FLAG);
  return { rest, printWorkspaceDir: on };
}

export function takeAssumeYesFlag(args: string[]): {
  rest: string[];
  assumeYes: boolean;
} {
  const yesShort = args.includes(ASSUME_YES_SHORT_FLAG);
  const yesLong = args.includes(ASSUME_YES_LONG_FLAG);
  const rest = args.filter(
    (a) => a !== ASSUME_YES_SHORT_FLAG && a !== ASSUME_YES_LONG_FLAG,
  );
  return { rest, assumeYes: yesShort || yesLong };
}
