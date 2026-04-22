import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 1_200_000; // 20 minutes

function timeoutMsFromEnv(): number {
  const raw = process.env.PR_AGENT_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_TIMEOUT_MS;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return n;
}

/** PR_AGENT if set; else "agent" with "cursor-agent" fallback on ENOENT. */
function resolveAgentBinary(): { agent: string; useFallback: boolean } {
  const fromEnv = process.env.PR_AGENT?.trim();
  if (fromEnv) {
    return { agent: fromEnv, useFallback: false };
  }
  return { agent: "agent", useFallback: true };
}

/**
 * Run `agent -p <prompt>` in print mode; return stdout. On first ENOENT, retry
 * `cursor-agent` if PR_AGENT was not set. Times out per PR_AGENT_TIMEOUT_MS (ms).
 */
export async function runAgentPrint(prompt: string): Promise<string> {
  const timeout = timeoutMsFromEnv();
  const { agent, useFallback } = resolveAgentBinary();

  try {
    return await spawnOnce(agent, prompt, timeout);
  } catch (e) {
    if (!useFallback || !isEnoent(e)) {
      throw e;
    }
  }

  return await spawnOnce("cursor-agent", prompt, timeout);
}

function isEnoent(e: unknown): boolean {
  return e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT";
}

function spawnOnce(
  command: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["-p", prompt], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
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
        reject(new Error(`agent timed out after ${timeoutMs}ms`));
      });
    }, timeoutMs);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (c: string) => {
      out += c;
    });
    child.stderr?.on("data", (c: string) => {
      err += c;
    });
    child.on("error", (e) => {
      finish(() => {
        reject(e);
      });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        finish(() => {
          const detail = err.trim() || "no stderr";
          reject(
            new Error(
              `agent ${command} exited ${String(code)}. stderr: ${detail.slice(0, 4000)}${detail.length > 4000 ? "…" : ""}`,
            ),
          );
        });
        return;
      }
      finish(() => {
        resolve(out);
      });
    });
  });
}
