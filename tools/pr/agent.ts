import { spawn } from "node:child_process";

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
      ["--workspace", repoRoot, "agent", prompt],
      { cwd: repoRoot, stdio: "inherit" }
    );
    child.on("error", (e) => {
      reject(e);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited ${String(code)}`));
        return;
      }
      resolve();
    });
  });
}
