import { spawn } from "node:child_process";
import process from "node:process";

import { AgentStreamHandler } from "./agentStreamFormat.ts";
import { PR_AGENT_DEFAULT_MODEL } from "./modelFlags.ts";

const AGENT_TIMEOUT_MS = 1_200_000; // 20 minutes

/** Global flags before `-p` so headless runs trust the process cwd (e.g. temp PR workspace). */
const AGENT_ARGS_BASE = [
  "--trust",
  "-p",
  "--output-format",
  "stream-json",
  "--stream-partial-output",
] as const;

export type RunAgentPrintOptions = {
  cwd?: string;
  /** Cursor agent model slug (`agent --list-models`); default {@link PR_AGENT_DEFAULT_MODEL}. */
  model?: string;
};

/**
 * Run agent in print mode with stream-json: stderr shows model, streaming text,
 * and tool lines; return value is the final `result` string (for JSON fence parse).
 */
export async function runAgentPrint(
  prompt: string,
  options: RunAgentPrintOptions = {},
): Promise<string> {
  const { cwd, model = PR_AGENT_DEFAULT_MODEL } = options;

  try {
    return await spawnOnceStream("agent", prompt, AGENT_TIMEOUT_MS, cwd, model);
  } catch (e) {
    if (!isEnoent(e)) {
      throw e;
    }
  }

  return await spawnOnceStream("cursor-agent", prompt, AGENT_TIMEOUT_MS, cwd, model);
}

function isEnoent(e: unknown): boolean {
  return e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT";
}

function spawnOnceStream(
  command: string,
  prompt: string,
  timeoutMs: number,
  cwd: string | undefined,
  model: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      [...AGENT_ARGS_BASE, "--model", model, prompt],
      {
        stdio: ["ignore", "pipe", "pipe"],
        ...(cwd !== undefined ? { cwd } : {}),
      },
    );
    const handler = new AgentStreamHandler();
    const errChunks: string[] = [];
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
      errChunks.push(c);
    });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      let start = 0;
      let nl = chunk.indexOf("\n");
      while (nl !== -1) {
        const line = lineBuf + chunk.slice(start, nl);
        lineBuf = "";
        start = nl + 1;
        const s = line.trim();
        if (s !== "") {
          let ev: unknown;
          try {
            ev = JSON.parse(s) as unknown;
          } catch {
            process.stderr.write(
              `[pr] skip non-JSON line: ${s.slice(0, 200)}${s.length > 200 ? "…" : ""}\n`,
            );
            nl = chunk.indexOf("\n", start);
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
        nl = chunk.indexOf("\n", start);
      }
      if (start < chunk.length) {
        lineBuf += chunk.slice(start);
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
          const detail = errChunks.join("").trim() || "no stderr";
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
