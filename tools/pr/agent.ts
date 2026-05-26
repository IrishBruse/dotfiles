import { spawn } from "node:child_process";

const AGENT_TIMEOUT_MS = 1_200_000;

const AGENT_ARGS = ["--trust", "-p", "--output-format", "text"] as const;

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
    const errChunks: string[] = [];
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
      outChunks.push(c);
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (c: string) => {
      errChunks.push(c);
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
          const detail = errChunks.join("").trim() || "no stderr";
          reject(
            new Error(
              `${command} exited ${String(code)}. stderr: ${detail.slice(0, 4000)}`
            )
          );
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
