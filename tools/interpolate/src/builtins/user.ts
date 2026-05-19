import os from "node:os";

export const key = "user";

export function resolve(): string {
  return os.userInfo().username;
}
