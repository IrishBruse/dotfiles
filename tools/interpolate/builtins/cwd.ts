import process from "node:process";

export const key = "cwd";

export function resolve(): string {
  return process.cwd();
}
