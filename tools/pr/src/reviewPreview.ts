import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

let configured = false;

function ensureMarked(): void {
  if (configured) {
    return;
  }
  // marked-terminal is a custom renderer; cast keeps marked v15 + ESM types happy
  marked.use(markedTerminal() as never);
  configured = true;
}

export function printMarkdownPreview(title: string, body: string): void {
  ensureMarked();
  const legend =
    "Preview — press Enter to post, Esc to cancel, Ctrl+C to exit.\n" +
    "─".repeat(60) +
    "\n";
  console.log(legend);
  if (title.trim() !== "") {
    console.log(String(marked.parse(`## ${title.replace(/\n/g, " ")}\n`)));
  }
  console.log(String(marked.parse(body)));
  console.log("─".repeat(60));
}

/**
 * Read one key in raw mode. Enter = post, Esc = cancel, Ctrl+C = exit 130.
 */
export function waitForPostOrCancel(): Promise<"post" | "cancel"> {
  if (!process.stdin.isTTY) {
    return Promise.reject(
      new Error("stdin is not a TTY; set PR_REVIEW_NO_CONFIRM=1 to skip"),
    );
  }
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (buf: Buffer): void => {
      if (buf.length < 1) {
        return;
      }
      const c = buf[0]!;
      if (c === 0x0d || c === 0x0a) {
        cleanup();
        resolve("post");
        return;
      }
      if (c === 0x1b) {
        cleanup();
        resolve("cancel");
        return;
      }
      if (c === 0x03) {
        process.exitCode = 130;
        process.exit(130);
      }
    };
    const cleanup = (): void => {
      if (process.stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.removeListener("data", onData);
    };
    stdin.on("data", onData);
  });
}
