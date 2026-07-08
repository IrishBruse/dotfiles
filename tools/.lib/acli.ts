import { execFile as execFileCb, spawnSync } from "node:child_process";
import { promisify } from "node:util";

const DEFAULT_ACLI = "acli";
const execFile = promisify(execFileCb);

function execFailureMessage(e: unknown): string {
  if (!(e && typeof e === "object")) {
    return String(e);
  }
  const ex = e as {
    message?: string;
    stderr?: unknown;
    stdout?: unknown;
    code?: unknown;
  };
  const stderr = ex.stderr !== undefined ? String(ex.stderr).trim() : "";
  const stdout = ex.stdout !== undefined ? String(ex.stdout).trim() : "";
  return stderr || stdout || ex.message || `exit ${String(ex.code ?? 1)}`;
}

/** Parse stdout when acli --paginate concatenates multiple JSON objects. */
export function parseConcatenatedJsonObjects(raw: string): unknown[] {
  const objects: unknown[] = [];
  let pos = 0;
  while (pos < raw.length) {
    while (pos < raw.length && raw[pos] !== "{" && raw[pos] !== "[") {
      pos++;
    }
    if (pos >= raw.length) break;
    const start = pos;
    const open = raw[pos];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let found = false;
    for (let i = pos; i < raw.length; i++) {
      const c = raw[i];
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          objects.push(JSON.parse(raw.slice(start, i + 1)) as unknown);
          pos = i + 1;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }
  return objects;
}

/** Parse acli stdout as one JSON value or paginated concatenated objects. */
export function parseAcliStdoutJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch (firstErr) {
    const objects = parseConcatenatedJsonObjects(trimmed);
    if (objects.length === 0) {
      const hint =
        firstErr instanceof Error ? firstErr.message : String(firstErr);
      throw new Error(
        `Expected JSON from acli (${hint}); got: ${trimmed.slice(0, 200)}...`
      );
    }
    if (objects.length === 1) return objects[0];
    return objects;
  }
}

export function runAcli(
  args: string[],
  acli = DEFAULT_ACLI
): { stdout: string } {
  const r = spawnSync(acli, args, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (r.error) {
    const msg = r.error instanceof Error ? r.error.message : String(r.error);
    throw new Error(`Failed to run ${acli}: ${msg}`);
  }
  if (r.status !== 0) {
    const err = r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`;
    throw new Error(err);
  }
  return { stdout: r.stdout?.trim() ?? "" };
}

export async function runAcliAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<{ stdout: string }> {
  try {
    const r = await execFile(acli, args, {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024
    });
    return { stdout: r.stdout?.trim() ?? "" };
  } catch (e: unknown) {
    throw new Error(execFailureMessage(e));
  }
}

export function runAcliJson(args: string[], acli = DEFAULT_ACLI): unknown {
  const { stdout } = runAcli(args, acli);
  if (!stdout) {
    return null;
  }
  return parseAcliStdoutJson(stdout);
}

export async function runAcliJsonAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<unknown> {
  const { stdout } = await runAcliAsync(args, acli);
  if (!stdout) {
    return null;
  }
  return parseAcliStdoutJson(stdout);
}
