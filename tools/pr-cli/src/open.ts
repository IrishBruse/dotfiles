import readline from "node:readline";
import process from "node:process";

export function extractPrPayloadFromAgentOutput(text: string): {
  title: string;
  body: string;
} {
  const marker = "```json";
  const open = text.lastIndexOf(marker);
  if (open === -1) {
    throw new Error("expected a ```json … ``` block in agent output");
  }
  const nl = text.indexOf("\n", open);
  const contentStart = nl === -1 ? open + marker.length : nl + 1;
  const close = text.indexOf("```", contentStart);
  if (close === -1) {
    throw new Error("unclosed ```json fence");
  }
  const inner = text.slice(contentStart, close).trim();
  let j: unknown;
  try {
    j = JSON.parse(inner);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`invalid JSON inside fence: ${msg}`);
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) {
    throw new Error("JSON root must be an object");
  }
  const o = j as Record<string, unknown>;
  if (typeof o.title !== "string" || typeof o.body !== "string") {
    throw new Error('JSON must include string fields "title" and "body"');
  }
  return { title: o.title, body: o.body };
}

export function waitEnterOrEscape(): Promise<"enter" | "escape"> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    if (!stdin.isTTY || !stdout.isTTY) {
      reject(new Error("stdin and stdout must be TTYs"));
      return;
    }
    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) stdin.setRawMode(true);
    const cleanup = () => {
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.removeListener("keypress", onKey);
    };
    const onKey = (_str: string, key: readline.Key) => {
      if (!key) return;
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve("enter");
      } else if (key.name === "escape") {
        cleanup();
        resolve("escape");
      }
    };
    stdin.on("keypress", onKey);
  });
}
