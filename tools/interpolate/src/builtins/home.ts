import os from "node:os";

export const key = "home";

export function resolve(): string {
  return os.homedir();
}
