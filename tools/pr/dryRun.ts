import process from "node:process";

import { markdown } from "../markdown/api.ts";

export function printDrySection(title: string, body: string): void {
  const section = `## ${title}\n\n${body.trimEnd()}\n`;
  process.stdout.write("\n");
  process.stdout.write(markdown(section));
  process.stdout.write("\n");
}
