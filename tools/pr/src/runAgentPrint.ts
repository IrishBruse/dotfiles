import { spawn } from "node:child_process";
import process from "node:process";

import { AgentStreamHandler } from "./agentStreamFormat.ts";

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

const AGENT_ARGS_BASE = [
  "-p",
  "--output-format",
  "stream-json",
  "--stream-partial-output",
] as const;

/**
 * Run agent in print mode with stream-json: stderr shows model, streaming text,
 * and tool lines; return value is the final `result` string (for JSON fence parse).
 */
export async function runAgentPrint(prompt: string): Promise<string> {
  const timeout = timeoutMsFromEnv();
  const { agent, useFallback } = resolveAgentBinary();

  try {
    return await spawnOnceStream(agent, prompt, timeout);
  } catch (e) {
    if (!useFallback || !isEnoent(e)) {
      throw e;
    }
  }

  return await spawnOnceStream("cursor-agent", prompt, timeout);
}

function isEnoent(e: unknown): boolean {
  return e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT";
}

function spawnOnceStream(
  command: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...AGENT_ARGS_BASE, prompt], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const handler = new AgentStreamHandler();
    let err = "";
    let lineBuf = "";
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
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (c: string) => {
      err += c;
    });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      lineBuf += chunk;
      const parts = lineBuf.split("\n");
      lineBuf = parts.pop() ?? "";
      for (const line of parts) {
        const s = line.trim();
        if (s === "") {
          continue;
        }
        let ev: unknown;
        try {
          ev = JSON.parse(s) as unknown;
        } catch {
          process.stderr.write(
            `[pr] skip non-JSON line: ${s.slice(0, 200)}${s.length > 200 ? "…" : ""}\n`,
          );
          continue;
        }
        try {
          handler.handleObject(ev);
        } catch (e) {
          process.stderr.write(
            `[pr] stream handler: ${e instanceof Error ? e.message : String(e)}\n`,
          );
        }
      }
    });
    child.on("error", (e) => {
      finish(() => {
        reject(e);
      });
    });
    child.on("close", (code) => {
      if (lineBuf.trim() !== "") {
        const s = lineBuf.trim();
        try {
          const ev = JSON.parse(s) as unknown;
          try {
            handler.handleObject(ev);
          } catch (e) {
            process.stderr.write(
              `[pr] stream handler: ${e instanceof Error ? e.message : String(e)}\n`,
            );
          }
        } catch {
          process.stderr.write(
            `[pr] trailing line not JSON: ${s.slice(0, 200)}${s.length > 200 ? "…" : ""}\n`,
          );
        }
      }
      if (code !== 0) {
        finish(() => {
          handler.endStream();
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
        handler.endStream();
        try {
          resolve(handler.getFinalResult());
        } catch (e) {
          reject(
            e instanceof Error
              ? e
              : new Error(`agent: ${String(e)}`),
          );
        }
      });
    });
  });
}
