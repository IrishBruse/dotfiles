import { spawnSync } from "node:child_process";
import * as readline from "node:readline/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export type SubmitPayload = {
  title: string;
  body: string;
};

/** First line `# Title` (or `##`), blank line, then markdown body — same idea as git commit message files. */
export function buildPreviewMarkdown(title: string, body: string): string {
  const t = title.trim().replace(/\n/g, " ");
  return `# ${t}\n\n${body.replace(/^\n+/, "")}`;
}

export function parsePreviewMarkdownFile(content: string): SubmitPayload {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === "") {
    i++;
  }
  if (i >= lines.length) {
    return { title: "", body: "" };
  }
  const first = lines[i]!.trim();
  let title: string;
  if (first.startsWith("#")) {
    title = first.replace(/^#+\s*/, "").trim();
    i++;
  } else {
    title = first;
    i++;
  }
  while (i < lines.length && lines[i]!.trim() === "") {
    i++;
  }
  const body = lines.slice(i).join("\n");
  return { title, body };
}

function writeTempPreviewFile(markdown: string): { file: string; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-preview-"));
  const file = path.join(dir, "pr-preview.md");
  fs.writeFileSync(file, markdown, "utf8");
  return { file, dir };
}

/**
 * Opens **`code --wait`** (or **`PR_PREVIEW_CODE`** binary) so the user can edit like **`git commit -e`**.
 * Blocks until the editor process exits (tab/window closed).
 */
export function openVsCodeWaitOnFile(filePath: string): void {
  const bin = process.env.PR_PREVIEW_CODE?.trim() || "code";
  const r = spawnSync(bin, ["--wait", filePath], { stdio: "inherit" });
  if (r.error) {
    throw new Error(`could not run ${bin}: ${r.error.message}`);
  }
  if (r.status !== 0 && r.status !== null) {
    throw new Error(`${bin} --wait exited with code ${r.status}`);
  }
}

export async function waitForYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error("stdin is not a TTY");
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const ans = (await rl.question(question)).trim().toLowerCase();
    return ans === "y" || ans === "yes";
  } finally {
    rl.close();
  }
}

export type EditorConfirmOptions = {
  logPrefix: string;
  initial: SubmitPayload;
  /** e.g. "create this PR", "update the PR", "post the review comment" */
  actionDescription: string;
  noConfirmEnvVar: string;
};

/**
 * Writes a temp **.md**, opens it in VS Code with **`--wait`**, re-reads the file (so edits apply),
 * then prompts **`[y/N]`** to confirm submit. Returns **`null`** if cancelled or invalid content.
 */
export async function confirmSubmitAfterEditorPreview(
  opts: EditorConfirmOptions,
): Promise<SubmitPayload | null> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new Error(
      `need an interactive TTY for editor preview; set ${opts.noConfirmEnvVar}=1 to skip`,
    );
  }

  const md = buildPreviewMarkdown(opts.initial.title, opts.initial.body);
  const { file, dir } = writeTempPreviewFile(md);
  const bin = process.env.PR_PREVIEW_CODE?.trim() || "code";

  console.error(
    `${opts.logPrefix} Opening ${file} in ${bin} — edit if needed, save, then close the tab.`,
  );

  try {
    openVsCodeWaitOnFile(file);
    const content = fs.readFileSync(file, "utf8");
    const parsed = parsePreviewMarkdownFile(content);
    if (parsed.title.trim() === "" || parsed.body.trim() === "") {
      console.error(
        `${opts.logPrefix} title and body must be non-empty after editing ` +
          `(keep a \`# Title\` line, blank line, then the description). Cancelled.`,
      );
      return null;
    }
    const ok = await waitForYesNo(
      `${opts.logPrefix} Ready to ${opts.actionDescription}? [y/N]: `,
    );
    return ok ? parsed : null;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

/**
 * After a failed `gh` post: Enter to retry, Esc to quit.
 */
export function waitForEnterRetryOrCancel(): Promise<"retry" | "cancel"> {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error("stdin is not a TTY"));
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
