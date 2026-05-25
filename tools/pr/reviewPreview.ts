import { spawnSync } from "node:child_process";
import * as readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  MERGED_PREVIEW_FILE,
  buildPreviewMarkdown,
  parsePreviewMarkdownFile,
  readAgentPrMarkdown,
} from "./agentOutputFiles.ts";

const VSCODE_CLI = "code";

export type SubmitPayload = {
  title: string;
  body: string;
};

/**
 * Opens **`code --wait`** so the user can edit like **`git commit -e`**.
 * Blocks until the editor process exits (tab/window closed).
 */
export function openVsCodeWaitOnFile(filePath: string): void {
  const r = spawnSync(VSCODE_CLI, ["--wait", filePath], { stdio: "inherit" });
  if (r.error) {
    throw new Error(`could not run ${VSCODE_CLI}: ${r.error.message}`);
  }
  if (r.status !== 0 && r.status !== null) {
    throw new Error(`${VSCODE_CLI} --wait exited with code ${r.status}`);
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
  workspaceDir: string;
  /** e.g. "create this PR", "update the PR", "post the review comment" */
  actionDescription: string;
  /** When true, proceed after closing the editor without a `[y/N]` prompt */
  skipConfirm?: boolean;
};

/**
 * Normalizes agent **`PR.md`**, opens it in VS Code with **`--wait`**, re-reads it (edits apply), then optionally prompts **`[y/N]`** (unless **`skipConfirm`**).
 * Removes the merged preview file when done. Returns **`null`** if cancelled or invalid.
 */
export async function confirmSubmitAfterEditorPreview(
  opts: EditorConfirmOptions,
): Promise<SubmitPayload | null> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new Error("need an interactive terminal (stdin/stdout TTY) for preview and confirm");
  }

  const cmdLabel = opts.logPrefix.replace(/:\s*$/, "").trim() || "pr";
  const initial = readAgentPrMarkdown(opts.workspaceDir, cmdLabel);

  const mergedPath = path.join(opts.workspaceDir, MERGED_PREVIEW_FILE);
  const md = buildPreviewMarkdown(initial.title, initial.body);
  fs.writeFileSync(mergedPath, md, "utf8");

  console.error(
    `${opts.logPrefix} Opening ${mergedPath} in ${VSCODE_CLI} — edit if needed, save, then close the tab.`,
  );

  try {
    openVsCodeWaitOnFile(path.resolve(mergedPath));
    const content = fs.readFileSync(mergedPath, "utf8");
    const parsed = parsePreviewMarkdownFile(content);
    if (parsed.title.trim() === "" || parsed.body.trim() === "") {
      console.error(
        `${opts.logPrefix} title and body must be non-empty after editing ` +
          `(start with one \`# Title\` line, a blank line, then the description). Cancelled.`,
      );
      return null;
    }
    if (opts.skipConfirm === true) {
      return parsed;
    }
    const ok = await waitForYesNo(
      `${opts.logPrefix} Ready to ${opts.actionDescription}? [y/N]: `,
    );
    return ok ? parsed : null;
  } finally {
    try {
      if (fs.existsSync(mergedPath)) {
        fs.unlinkSync(mergedPath);
      }
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
