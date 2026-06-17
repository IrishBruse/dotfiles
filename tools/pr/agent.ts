import { spawn } from "node:child_process";

import { createAgentStreamRenderer } from "./streamJsonView.ts";

const AGENT_TIMEOUT_MS = 1_200_000;

const AGENT_ARGS = ["--trust", "-p", "--output-format", "stream-json"] as const;

export async function runAgent(prompt: string, repoRoot: string): Promise<void> {
  try {
    await spawnAgent("agent", prompt, repoRoot);
  } catch (e) {
    if (!isEnoent(e)) {
      throw e;
    }
    await spawnAgent("cursor-agent", prompt, repoRoot);
  }
}

function isEnoent(e: unknown): boolean {
  return (
    e instanceof Error &&
    "code" in e &&
    (e as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function spawnAgent(
  command: string,
  prompt: string,
  repoRoot: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      [...AGENT_ARGS, "--workspace", repoRoot, prompt],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] }
    );
    let lineBuffer = "";
    const view = createAgentStreamRenderer();
    let finished = false;
    const finish = (fn: () => void) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => {
        reject(new Error(`agent timed out after ${AGENT_TIMEOUT_MS}ms`));
      });
    }, AGENT_TIMEOUT_MS);
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (c: string) => {
      lineBuffer += c;
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        view.onLine(line);
      }
    });
    child.on("error", (e) => {
      finish(() => {
        reject(e);
      });
    });
    child.on("close", (code) => {
      finish(() => {
        if (lineBuffer.trim() !== "") {
          view.onLine(lineBuffer);
        }
        view.flush();
        if (code !== 0) {
          reject(new Error(`${command} exited ${String(code)}`));
          return;
        }
        resolve();
      });
    });
  });
}
