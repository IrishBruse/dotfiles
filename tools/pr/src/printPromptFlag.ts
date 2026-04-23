/** If present in argv, only print the resolved agent prompt to stdout and exit. */
export const PRINT_PROMPT_FLAG = "--print-prompt";

/** Prefetch workspace and edit flow as usual, but do not run the Cursor agent. */
export const NO_AGENT_FLAG = "--no-agent";

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
