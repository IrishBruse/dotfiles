import { execFile as execFileCb, spawnSync } from "node:child_process";
import { promisify } from "node:util";

const DEFAULT_ACLI = "acli";
const execFile = promisify(execFileCb);

function execFailureMessage(e: unknown): string {
  if (!(e && typeof e === "object")) {
    return String(e);
  }
  const ex = e as { message?: string; stderr?: unknown; stdout?: unknown; code?: unknown };
  const stderr = ex.stderr !== undefined ? String(ex.stderr).trim() : "";
  const stdout = ex.stdout !== undefined ? String(ex.stdout).trim() : "";
  return stderr || stdout || ex.message || `exit ${String(ex.code ?? 1)}`;
}

export function runAcli(
  args: string[],
  acli = DEFAULT_ACLI
): { stdout: string; stderr: string } {
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
  return {
    stdout: r.stdout?.trim() ?? "",
    stderr: r.stderr?.trim() ?? ""
  };
}

export async function runAcliAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<{ stdout: string; stderr: string }> {
  try {
    const r = await execFile(acli, args, {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024
    });
    return {
      stdout: r.stdout?.trim() ?? "",
      stderr: r.stderr?.trim() ?? ""
    };
  } catch (e: unknown) {
    throw new Error(execFailureMessage(e));
  }
}

export function runAcliJson(args: string[], acli = DEFAULT_ACLI): unknown {
  const { stdout } = runAcli(args, acli);
  if (!stdout) {
    return null;
  }
  try {
    return JSON.parse(stdout) as unknown;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Expected JSON from acli (${hint}); got: ${stdout.slice(0, 200)}…`
    );
  }
}

export async function runAcliJsonAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<unknown> {
  const { stdout } = await runAcliAsync(args, acli);
  if (!stdout) {
    return null;
  }
  try {
    return JSON.parse(stdout) as unknown;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Expected JSON from acli (${hint}); got: ${stdout.slice(0, 200)}…`
    );
  }
}

function workitemViewFields(
  data: unknown
): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const fields = (data as { fields?: Record<string, unknown> }).fields;
  return fields ?? {};
}

/** Fetch a subset of fields via `acli jira workitem view`. */
export function fetchWorkitemViewFields(
  key: string,
  fields: string,
  acli = DEFAULT_ACLI
): Record<string, unknown> {
  const data = runAcliJson(
    ["jira", "workitem", "view", key, "--fields", fields, "--json"],
    acli
  );
  return workitemViewFields(data);
}

/** Merge view-only fields into issues returned by `workitem search`. */
export function enrichIssuesWithViewFields(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  fields: string,
  acli = DEFAULT_ACLI
): void {
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    const extra = fetchWorkitemViewFields(key, fields, acli);
    issue.fields = { ...(issue.fields ?? {}), ...extra };
  }
}
