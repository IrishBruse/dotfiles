import { spawnSync } from "node:child_process";

const MAX_LOG_LINES = 300;

export type PrCheck = {
  name: string;
  workflowName: string;
  conclusion: string;
  status: string;
  detailsUrl: string;
  startedAt: string;
  completedAt: string;
};

export type WorkflowRun = {
  databaseId: number;
  workflowName: string;
  status: string;
  conclusion: string;
  url: string;
  displayTitle: string;
};

const FAILED_CONCLUSIONS = new Set([
  "FAILURE",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE"
]);

function runGh(
  repoRoot: string,
  args: string[],
  acceptNonZero = false
): string | undefined {
  const r = spawnSync("gh", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  });
  if (r.status !== 0 && !acceptNonZero) {
    return undefined;
  }
  const out = (r.stdout ?? "").trimEnd();
  if (out !== "") {
    return out;
  }
  const err = (r.stderr ?? "").trimEnd();
  return err !== "" ? err : undefined;
}

function section(
  lines: string[],
  heading: string,
  body: string | undefined
): void {
  lines.push("", heading);
  if (body === undefined) {
    lines.push("(command failed)");
    return;
  }
  if (body === "") {
    lines.push("(none)");
    return;
  }
  lines.push(body);
}

function parseStatusCheckRollup(raw: string | undefined): PrCheck[] {
  if (raw === undefined) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const out: PrCheck[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (row.__typename !== "CheckRun") {
      continue;
    }
    if (
      typeof row.name !== "string" ||
      typeof row.workflowName !== "string" ||
      typeof row.conclusion !== "string" ||
      typeof row.status !== "string" ||
      typeof row.detailsUrl !== "string" ||
      typeof row.startedAt !== "string" ||
      typeof row.completedAt !== "string"
    ) {
      continue;
    }
    out.push({
      name: row.name,
      workflowName: row.workflowName,
      conclusion: row.conclusion,
      status: row.status,
      detailsUrl: row.detailsUrl,
      startedAt: row.startedAt,
      completedAt: row.completedAt
    });
  }
  return out;
}

function extractJobId(detailsUrl: string): string | undefined {
  const match = detailsUrl.match(/\/actions\/runs\/\d+\/job\/(\d+)/);
  return match?.[1];
}

function truncateLog(text: string): string {
  const lines = text.split("\n");
  if (lines.length <= MAX_LOG_LINES) {
    return text;
  }
  const omitted = lines.length - MAX_LOG_LINES;
  return [
    `(... ${String(omitted)} earlier log lines omitted ...)`,
    ...lines.slice(-MAX_LOG_LINES)
  ].join("\n");
}

function fetchFailedJobLog(repoRoot: string, jobId: string): string | undefined {
  const r = spawnSync("gh", ["run", "view", "--job", jobId, "--log-failed"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  });
  const out = (r.stdout ?? "").trimEnd();
  if (out === "") {
    return undefined;
  }
  return truncateLog(out);
}

function listWorkflowRuns(
  repoRoot: string,
  branch: string
): WorkflowRun[] | undefined {
  const raw = runGh(repoRoot, [
    "run",
    "list",
    "--branch",
    branch,
    "--limit",
    "10",
    "--json",
    "databaseId,workflowName,status,conclusion,url,displayTitle"
  ]);
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const out: WorkflowRun[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.databaseId !== "number" ||
      typeof row.workflowName !== "string" ||
      typeof row.status !== "string" ||
      typeof row.conclusion !== "string" ||
      typeof row.url !== "string" ||
      typeof row.displayTitle !== "string"
    ) {
      continue;
    }
    out.push({
      databaseId: row.databaseId,
      workflowName: row.workflowName,
      status: row.status,
      conclusion: row.conclusion,
      url: row.url,
      displayTitle: row.displayTitle
    });
  }
  return out;
}

function formatChecksTable(checks: PrCheck[]): string {
  if (checks.length === 0) {
    return "(no checks reported)";
  }
  return checks
    .map((check) => {
      const parts = [
        check.workflowName,
        check.name,
        check.conclusion || check.status,
        check.detailsUrl
      ];
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");
}

function formatWorkflowRuns(runs: WorkflowRun[]): string {
  if (runs.length === 0) {
    return "(no workflow runs for this branch)";
  }
  return runs
    .map((run) => {
      return `- ${run.workflowName} | ${run.conclusion || run.status} | ${run.displayTitle} | ${run.url}`;
    })
    .join("\n");
}

export function failedChecks(checks: PrCheck[]): PrCheck[] {
  return checks.filter((check) => FAILED_CONCLUSIONS.has(check.conclusion));
}

export function appendWorkflowContext(
  lines: string[],
  repoRoot: string,
  branch: string,
  prTarget?: string
): PrCheck[] {
  const viewArgs =
    prTarget !== undefined && prTarget !== ""
      ? [
          "pr",
          "view",
          prTarget,
          "--json",
          "number,title,url,headRefName,mergeable,mergeStateStatus,statusCheckRollup"
        ]
      : [
          "pr",
          "view",
          "--json",
          "number,title,url,headRefName,mergeable,mergeStateStatus,statusCheckRollup"
        ];

  const prJson = runGh(repoRoot, viewArgs);
  lines.push("", "Pull request CI status:");

  let checks: PrCheck[] = [];
  let prBranch = branch;
  if (prJson !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(prJson);
    } catch {
      section(lines, "### gh pr view", prJson);
    }
    if (typeof parsed === "object" && parsed !== null) {
      const pr = parsed as Record<string, unknown>;
      if (typeof pr.headRefName === "string" && pr.headRefName !== "") {
        prBranch = pr.headRefName;
      }
      const summary = [
        `number: ${String(pr.number ?? "?")}`,
        `title: ${String(pr.title ?? "?")}`,
        `url: ${String(pr.url ?? "?")}`,
        `headRefName: ${prBranch}`,
        `mergeable: ${String(pr.mergeable ?? "?")}`,
        `mergeStateStatus: ${String(pr.mergeStateStatus ?? "?")}`
      ].join("\n");
      section(lines, "### gh pr view", summary);
      if (prBranch !== branch) {
        lines.push(
          `(current checkout is ${branch}; workflow runs use PR branch ${prBranch})`
        );
      }
      checks = parseStatusCheckRollup(
        JSON.stringify(pr.statusCheckRollup ?? [])
      );
    }
  } else {
    section(lines, "### gh pr view", undefined);
  }

  const checksArgs =
    prTarget !== undefined && prTarget !== ""
      ? ["pr", "checks", prTarget]
      : ["pr", "checks"];
  section(lines, "### gh pr checks", runGh(repoRoot, checksArgs, true));
  section(lines, "### status check rollup", formatChecksTable(checks));

  const runs = listWorkflowRuns(repoRoot, prBranch);
  section(lines, "### recent workflow runs on branch", formatWorkflowRuns(runs ?? []));

  const failures = failedChecks(checks);
  if (failures.length === 0) {
    lines.push("", "Failed checks: none");
    return checks;
  }

  lines.push("", "Failed checks:");
  for (const check of failures) {
    lines.push(
      "",
      `#### ${check.workflowName} / ${check.name}`,
      `conclusion: ${check.conclusion}`,
      `details: ${check.detailsUrl}`
    );
    const jobId = extractJobId(check.detailsUrl);
    if (jobId === undefined) {
      lines.push("(could not parse job id from details url)");
      continue;
    }
    const log = fetchFailedJobLog(repoRoot, jobId);
    lines.push("", `##### gh run view --job ${jobId} --log-failed`);
    if (log === undefined) {
      lines.push("(log unavailable or empty)");
      continue;
    }
    lines.push(log);
  }

  return checks;
}
