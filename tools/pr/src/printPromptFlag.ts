/** If present in argv, only print the resolved agent prompt to stdout and exit. */
export const PRINT_PROMPT_FLAG = "--print-prompt";

export function takePrintPromptFlag(args: string[]): {
  rest: string[];
  printPrompt: boolean;
} {
  const printPrompt = args.includes(PRINT_PROMPT_FLAG);
  const rest = args.filter((a) => a !== PRINT_PROMPT_FLAG);
  return { rest, printPrompt };
}
