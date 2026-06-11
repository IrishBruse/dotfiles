import { spawn } from "node:child_process";

const AGENT_TIMEOUT_MS = 300_000;

/** Read-only Q&A mode: no edits, shell, or git. */
const AGENT_MODE = "ask" as const;

const AGENT_ARGS = [
  "--trust",
  "-p",
  "--mode",
  AGENT_MODE,
  "--output-format",
  "text"
] as const;

export async function runAgent(prompt: string, repoRoot: string): Promise<string> {
  try {
    return await spawnAgent("agent", prompt, repoRoot);
  } catch (e) {
    if (!isEnoent(e)) {
      throw e;
    }
  }
  return await spawnAgent("cursor-agent", prompt, repoRoot);
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
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      [...AGENT_ARGS, "--workspace", repoRoot, prompt],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] }
    );
    const outChunks: string[] = [];
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
    child.stdout?.on("data", (chunk: string) => {
      outChunks.push(chunk);
    });
    child.on("error", (e) => {
      finish(() => {
        reject(e);
      });
    });
    child.on("close", (code) => {
      finish(() => {
        const text = outChunks.join("").trim();
        if (code !== 0) {
          reject(new Error(`${command} exited ${String(code)}`));
          return;
        }
        if (text === "") {
          reject(new Error(`${command} produced no stdout`));
          return;
        }
        resolve(text);
      });
    });
  });
}
