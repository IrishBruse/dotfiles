/** If present in argv, only print the resolved agent prompt to stdout and exit. */
export const PRINT_PROMPT_FLAG = "--print-prompt";

/** Prefetch workspace and edit flow as usual, but do not run the Cursor agent. */
export const NO_AGENT_FLAG = "--no-agent";

export function takePrintPromptFlag(args: string[]): {
  rest: string[];
  printPrompt: boolean;
} {
  const printPrompt = args.includes(PRINT_PROMPT_FLAG);
  const rest = args.filter((a) => a !== PRINT_PROMPT_FLAG);
  return { rest, printPrompt };
}

export function takeNoAgentFlag(args: string[]): {
  rest: string[];
  noAgent: boolean;
} {
  const noAgent = args.includes(NO_AGENT_FLAG);
  const rest = args.filter((a) => a !== NO_AGENT_FLAG);
  return { rest, noAgent };
}
