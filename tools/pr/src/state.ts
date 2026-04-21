import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function stateDir(): string {
  return path.join(os.homedir(), ".local", "state", "pr-cli");
}

function stateFile(): string {
  return path.join(stateDir(), "last-head.json");
}

export function readState(): Record<string, string> {
  try {
    const raw = fs.readFileSync(stateFile(), "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeStateEntry(key: string, headOid: string): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  const next = { ...readState(), [key]: headOid };
  fs.writeFileSync(stateFile(), JSON.stringify(next, null, 2), "utf8");
}
