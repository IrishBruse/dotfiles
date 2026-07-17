/**
 * `jira doctor` -- verify acli, auth, CONFIG, and board cache.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

import { listProjects } from "../../lib/acli-jira.ts";
import { blockedAcliJiraReason } from "../../lib/acli-policy.ts";
import { readBoardInfoCache, readBoardCache } from "../../lib/board-cache.ts";
import { CONFIG, configuredProject } from "../../lib/CONFIG.ts";
import { countLocalTickets } from "../../lib/local.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { printJsonSuccess } from "../../lib/output.ts";
import type { DoctorCheck } from "../../lib/types.ts";

function acliOnPath(): DoctorCheck {
  const result = spawnSync("acli", ["--version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) {
    return {
      name: "acli",
      ok: false,
      message: "acli not found on PATH",
      fix: "Install Atlassian CLI (acli) and ensure it is on PATH"
    };
  }
  const version = (result.stdout || result.stderr || "").trim().split("\n")[0];
  return {
    name: "acli",
    ok: true,
    message: version ? `acli available (${version})` : "acli available"
  };
}

function authCheck(): DoctorCheck {
  try {
    listProjects();
    return {
      name: "auth",
      ok: true,
      message: "Jira auth OK (project list succeeded)"
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      name: "auth",
      ok: false,
      message: `Jira auth failed: ${msg}`,
      fix: "Run: jira acli auth login"
    };
  }
}

function configCheck(): DoctorCheck {
  const missing: string[] = [];
  if (!CONFIG.site.trim()) missing.push("site");
  if (!CONFIG.meAccountId.trim()) missing.push("meAccountId");
  if (!CONFIG.boardId.trim()) missing.push("boardId");
  if (!configuredProject()) missing.push("project");
  if (missing.length > 0) {
    return {
      name: "config",
      ok: false,
      message: `Config missing: ${missing.join(", ")}`,
      fix: "Create ~/.config/jira/config.json (see tools/jira/jira.config.example.json)"
    };
  }
  return {
    name: "config",
    ok: true,
    message: `Config OK (project ${configuredProject()})`
  };
}

function boardCacheCheck(): DoctorCheck {
  const infoCache = readBoardInfoCache();
  const boardCache = readBoardCache();
  if (!infoCache || !boardCache) {
    const missing: string[] = [];
    if (!infoCache) missing.push("info.json");
    if (!boardCache) missing.push("board.json");
    return {
      name: "board-cache",
      ok: false,
      message: `Board cache not synced (missing ${missing.join(", ")})`,
      fix: "Run: jira sync"
    };
  }

  const syncedMs = Date.parse(infoCache.syncedAt);
  const maxAgeMs = CONFIG.boardCacheMaxAgeDays * 24 * 60 * 60 * 1000;
  const ageMs = Number.isNaN(syncedMs) ? Infinity : Date.now() - syncedMs;
  const stale = ageMs > maxAgeMs;

  const ageDays =
    Number.isFinite(ageMs) && ageMs >= 0
      ? Math.floor(ageMs / (24 * 60 * 60 * 1000))
      : null;
  const ageLabel = ageDays === null ? "unknown age" : `${ageDays} day(s) old`;

  if (stale) {
    return {
      name: "board-cache",
      ok: false,
      message: `Board cache stale (${ageLabel}, synced ${infoCache.syncedAt})`,
      fix: "Run: jira sync"
    };
  }

  return {
    name: "board-cache",
    ok: true,
    message: `Board cache OK (${ageLabel}, ${infoCache.issueCount} issues)`
  };
}

function localTicketsCheck(): DoctorCheck {
  const count = countLocalTickets();
  return {
    name: "local-tickets",
    ok: true,
    message: `${count} ticket(s) under jira/`
  };
}

function acliPolicyCheck(): DoctorCheck {
  const blocked = blockedAcliJiraReason([
    "jira",
    "workitem",
    "create",
    "--summary",
    "x"
  ]);
  if (!blocked) {
    return {
      name: "acli-policy",
      ok: false,
      message: "acli policy did not block workitem create"
    };
  }
  return {
    name: "acli-policy",
    ok: true,
    message: "acli write gate active"
  };
}

export function gatherDoctorChecks(): DoctorCheck[] {
  const checks: DoctorCheck[] = [acliOnPath()];
  if (checks[0]?.ok) {
    checks.push(authCheck());
  } else {
    checks.push({
      name: "auth",
      ok: false,
      message: "Skipped (acli not available)",
      fix: "Install acli first"
    });
  }
  checks.push(configCheck(), boardCacheCheck(), localTicketsCheck(), acliPolicyCheck());
  return checks;
}

function formatDoctorHuman(checks: DoctorCheck[]): string {
  const lines = ["Jira doctor", ""];
  for (const check of checks) {
    const mark = check.ok ? "ok" : "FAIL";
    lines.push(`[${mark}] ${check.name}: ${check.message}`);
    if (!check.ok && check.fix) {
      lines.push(`      fix: ${check.fix}`);
    }
  }
  const failed = checks.filter((c) => !c.ok).length;
  lines.push("");
  lines.push(
    failed === 0
      ? "All checks passed."
      : `${failed} check(s) failed.`
  );
  return `${lines.join("\n")}\n`;
}

/** True when acli binary exists on PATH (for tests without live auth). */
export function acliBinaryPresent(): boolean {
  const result = spawnSync("which", ["acli"], { encoding: "utf-8" });
  return result.status === 0 && Boolean(result.stdout.trim());
}

/** Run doctor checks; skips live auth when acli is missing. */
export function gatherDoctorChecksForTest(): DoctorCheck[] {
  if (!acliBinaryPresent()) {
    return [
      {
        name: "acli",
        ok: false,
        message: "acli not found on PATH",
        fix: "Install Atlassian CLI (acli) and ensure it is on PATH"
      },
      {
        name: "auth",
        ok: false,
        message: "Skipped (acli not available)",
        fix: "Install acli first"
      },
      configCheck(),
      boardCacheCheck(),
      localTicketsCheck(),
      acliPolicyCheck()
    ];
  }
  return gatherDoctorChecks();
}

/** Run `jira doctor`. */
export function runDoctorCommand(options: CommandOptions = HUMAN_OUTPUT): number {
  const checks = gatherDoctorChecksForTest();
  const failed = checks.filter((c) => !c.ok);

  if (isJsonMode(options)) {
    printJsonSuccess({ checks });
    return failed.length === 0 ? 0 : 1;
  }

  process.stdout.write(formatDoctorHuman(checks));
  return failed.length === 0 ? 0 : 1;
}
