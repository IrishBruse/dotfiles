import { execFileSync } from "node:child_process";
import { existsSync, readlinkSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { userInfo } from "node:os";
import path from "node:path";
import type { Connect } from "vite";
import type { Plugin } from "vite";

export type LocalPort = {
  port: number;
  address: string;
  process: string;
  folder: string;
  cwd: string | null;
  pid: number;
};

const DEV_COMMANDS = new Set([
  "node",
  "MainThread",
  "python",
  "python3",
  "ruby",
  "go",
  "dotnet",
  "java",
  "php",
  "bun",
  "deno"
]);

function isDevProcess(command: string): boolean {
  const base = command.toLowerCase();
  if (DEV_COMMANDS.has(command) || DEV_COMMANDS.has(base)) {
    return true;
  }
  return /vite|webpack|next|nuxt|react|angular|rails|django|flask|uvicorn|gunicorn|esbuild|turbo|remix|astro|svelte|parcel|rollup|wrangler|cargo|air|php-fpm/i.test(
    command
  );
}

function parseLsofOutput(text: string): LocalPort[] {
  const ports: LocalPort[] = [];
  let pid = 0;
  let process = "";

  for (const line of text.split("\n")) {
    if (!line) {
      continue;
    }
    const tag = line[0];
    const value = line.slice(1);
    if (tag === "p") {
      pid = Number.parseInt(value, 10);
      process = "";
      continue;
    }
    if (tag === "c") {
      process = value;
      continue;
    }
    if (tag !== "n" || pid <= 0 || !process || value.includes("->")) {
      continue;
    }
    const match = value.match(/^(?:\[?[\da-f:.]+\]?):(\d+)$/i);
    if (!match) {
      continue;
    }
    ports.push({
      port: Number.parseInt(match[1]!, 10),
      address: value,
      process,
      pid
    });
  }

  return ports;
}

const cwdCache = new Map<number, string | null>();

function processCwd(pid: number): string | null {
  const cached = cwdCache.get(pid);
  if (cached !== undefined) {
    return cached;
  }

  const procCwd = `/proc/${pid}/cwd`;
  if (existsSync(procCwd)) {
    try {
      const cwd = readlinkSync(procCwd);
      cwdCache.set(pid, cwd);
      return cwd;
    } catch {
      cwdCache.set(pid, null);
      return null;
    }
  }

  try {
    const output = execFileSync(
      "lsof",
      ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
      { encoding: "utf8", timeout: 2000 }
    );
    for (const line of output.split("\n")) {
      if (line.startsWith("n")) {
        const cwd = line.slice(1);
        cwdCache.set(pid, cwd);
        return cwd;
      }
    }
  } catch {
    // fall through
  }

  cwdCache.set(pid, null);
  return null;
}

function folderLabel(cwd: string | null, process: string): string {
  if (!cwd) {
    return process;
  }
  const name = path.basename(cwd);
  return name || process;
}

export function scanLocalPorts(): LocalPort[] {
  cwdCache.clear();
  const { uid, username } = userInfo();
  let output = "";
  try {
    output = execFileSync(
      "lsof",
      ["-iTCP", "-sTCP:LISTEN", "-n", "-P", "-F", "pcn", "-a", "-u", String(uid)],
      {
        encoding: "utf8",
        timeout: 5000
      }
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; status?: number };
    if (err.status === 1 && err.stdout) {
      output = err.stdout;
    } else {
      try {
        output = execFileSync(
          "lsof",
          ["-iTCP", "-sTCP:LISTEN", "-n", "-P", "-F", "pcn", "-a", "-u", username],
          {
            encoding: "utf8",
            timeout: 5000
          }
        );
      } catch (fallbackError) {
        const fallback = fallbackError as NodeJS.ErrnoException & {
          stdout?: string;
          status?: number;
        };
        if (fallback.status === 1 && fallback.stdout) {
          output = fallback.stdout;
        } else {
          throw fallbackError;
        }
      }
    }
  }

  const seen = new Set<number>();
  const ports: LocalPort[] = [];

  for (const row of parseLsofOutput(output)) {
    if (seen.has(row.port)) {
      continue;
    }
    if (!isDevProcess(row.process)) {
      continue;
    }
    const cwd = processCwd(row.pid);
    seen.add(row.port);
    ports.push({
      ...row,
      cwd,
      folder: folderLabel(cwd, row.process)
    });
  }

  return ports.sort((a, b) => a.port - b.port);
}

function processOwnerUid(pid: number): number | null {
  try {
    const owner = execFileSync("ps", ["-o", "uid=", "-p", String(pid)], {
      encoding: "utf8",
      timeout: 2000
    }).trim();
    const uid = Number.parseInt(owner, 10);
    return Number.isFinite(uid) ? uid : null;
  } catch {
    return null;
  }
}

export function killLocalPortProcess(pid: number): void {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("Invalid pid");
  }

  const { uid } = userInfo();
  const owner = processOwnerUid(pid);
  if (owner !== uid) {
    throw new Error("Process not owned by current user");
  }

  const allowed = scanLocalPorts().some((row) => row.pid === pid);
  if (!allowed) {
    throw new Error("Process is not a listed dev server");
  }

  process.kill(pid, "SIGTERM");
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function portsMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/api/ports/kill" && req.method === "POST") {
      res.setHeader("Content-Type", "application/json");
      void (async () => {
        try {
          const body = (await readJsonBody(req)) as { pid?: number };
          killLocalPortProcess(body.pid ?? 0);
          res.end(JSON.stringify({ ok: true, ports: scanLocalPorts() }));
        } catch (error) {
          res.statusCode =
            error instanceof Error && error.message.includes("not owned")
              ? 403
              : 400;
          res.end(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : "Kill failed"
            })
          );
        }
      })();
      return;
    }

    if (url.pathname !== "/api/ports" || req.method !== "GET") {
      next();
      return;
    }

    res.setHeader("Content-Type", "application/json");
    try {
      res.end(JSON.stringify({ ok: true, ports: scanLocalPorts() }));
    } catch (error) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "Port scan failed"
        })
      );
    }
  };
}

/** Dev-server middleware that lists local TCP listeners owned by the current user. */
export function localPorts(): Plugin {
  return {
    name: "local-ports",
    configureServer(server) {
      server.middlewares.use(portsMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(portsMiddleware());
    }
  };
}
