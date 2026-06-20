import { fstatSync } from "node:fs";
import process from "node:process";

export function takeOptionalFlag(
  args: string[],
  flag: string
): { rest: string[]; value?: string } {
  const rest: string[] = [];
  let value: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === flag) {
      const next = args[++i];
      if (next === undefined || next.startsWith("-")) {
        throw new Error(`${flag} requires a value`);
      }
      value = next;
      continue;
    }
    if (arg.startsWith(`${flag}=`)) {
      value = arg.slice(flag.length + 1);
      continue;
    }
    rest.push(arg);
  }
  return { rest, value };
}

function stdinIsPiped(): boolean {
  if (process.stdin.isTTY) {
    return false;
  }
  try {
    return fstatSync(process.stdin.fd).isFIFO();
  } catch {
    return false;
  }
}

export async function readStdin(): Promise<string> {
  if (!stdinIsPiped()) {
    return "";
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}
