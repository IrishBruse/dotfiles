import { spawnSync } from "node:child_process";

const DEFAULT_ACLI = "acli";

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
