import process from "node:process";

import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";

function terminalWidth(): number {
  return Math.max(40, process.stdout.columns || 80);
}

const md = new Marked();
md.use(
  markedTerminal({
    reflowText: true,
    width: terminalWidth(),
  }),
);

/** Render GitHub-flavored markdown to ANSI for terminal preview. */
export function markdownToAnsi(src: string): string {
  const text = src.length === 0 ? "_\n_" : src;
  return md.parse(text, { async: false }) as string;
}
