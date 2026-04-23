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

/** Drop HR / table-border-style lines of only punctuation for TTY preview */
function bodyForPreview(body: string): string {
  return body
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.length < 3) {
        return true;
      }
      if (/^[-= *_#·─\s]+$/u.test(t)) {
        return false;
      }
      return true;
    })
    .join("\n");
}

export type MarkdownPreviewOptions = {
  /** Shown in the TTY hint line, e.g. `apply` for `gh pr edit`. Default: `post`. */
  enterAction?: string;
};

export function printMarkdownPreview(
  title: string,
  body: string,
  options?: MarkdownPreviewOptions,
): void {
  ensureMarked();
  const enterAction = options?.enterAction ?? "post";
  console.log(`Preview: Enter = ${enterAction}, Esc = cancel, Ctrl+C = exit\n`);
  if (title.trim() !== "") {
    console.log(
      String(marked.parse(`## ${title.replace(/\n/g, " ")}\n`)),
    );
  }
  console.log(String(marked.parse(bodyForPreview(body))));
}

/**
 * After a failed `gh` post: Enter to retry, Esc to quit.
 */
export function waitForEnterRetryOrCancel(): Promise<"retry" | "cancel"> {
  if (!process.stdin.isTTY) {
    return Promise.reject(
      new Error("stdin is not a TTY"),
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
        resolve("retry");
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

/**
 * Read one key in raw mode. Enter = post, Esc = cancel, Ctrl+C = exit 130.
 */
export function waitForPostOrCancel(
  noConfirmHint: string = "PR_REVIEW_NO_CONFIRM=1",
): Promise<"post" | "cancel"> {
  if (!process.stdin.isTTY) {
    return Promise.reject(
      new Error(`stdin is not a TTY; set ${noConfirmHint} to skip`),
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
