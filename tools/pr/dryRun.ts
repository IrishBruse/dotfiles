import process from "node:process";

const SEPARATOR = "-".repeat(72);

export function printDrySection(title: string, body: string): void {
  process.stdout.write(`\n${SEPARATOR}\n${title}\n${SEPARATOR}\n\n`);
  process.stdout.write(body);
  if (!body.endsWith("\n")) {
    process.stdout.write("\n");
  }
}
