import process from "node:process";

export const envNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

const envPattern = /\{\{env:([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

/** Expand `{{env:NAME}}` placeholders (call only after validation). */
export function expand(text: string): string {
  return text.replace(envPattern, (_, name: string) => process.env[name]!);
}
