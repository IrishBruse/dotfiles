function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

/** One path per line with +/- counts when available (from `gh pr view --json files`). */
export function filesChangedTextFromJson(filesJsonRaw: string): string {
  const j = safeParseJson(filesJsonRaw) as
    | { files?: Array<Record<string, unknown>> }
    | null
    | undefined;
  const files = j?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return "(no files in gh response, or could not parse `gh pr view --json files`)\n";
  }
  const lines: string[] = [];
  for (const f of files) {
    if (f === null || typeof f !== "object") {
      continue;
    }
    const p = typeof f.path === "string" ? f.path : "?";
    const add = typeof f.additions === "number" ? f.additions : 0;
    const del = typeof f.deletions === "number" ? f.deletions : 0;
    const ch = typeof f.changeType === "string" ? f.changeType : "";
    const tail = ch !== "" ? `  [${ch}]` : "";
    lines.push(`${p}  +${add} -${del}${tail}`);
  }
  return lines.join("\n") + "\n";
}

function collectCheckLines(rollup: unknown, out: string[], depth: number): void {
  if (depth > 12 || rollup === null || rollup === undefined) {
    return;
  }
  if (Array.isArray(rollup)) {
    for (const e of rollup) {
      collectCheckLines(e, out, depth + 1);
    }
    return;
  }
  if (typeof rollup !== "object") {
    return;
  }
  const r = rollup as Record<string, unknown>;
  const n =
    (typeof r.name === "string" && r.name) ||
    (typeof r.context === "string" && r.context) ||
    "";
  const st =
    (typeof r.state === "string" && r.state) ||
    (typeof r.status === "string" && r.status) ||
    (typeof r.conclusion === "string" && r.conclusion) ||
    "";
  if (n !== "" && st !== "") {
    out.push(`${n}: ${st}`);
  }
  for (const v of Object.values(r)) {
    collectCheckLines(v, out, depth + 1);
  }
}

/** Short CI digest from `statusCheckRollup` JSON. */
export function checksSummaryTextFromJson(checksJsonRaw: string): string {
  const j = safeParseJson(checksJsonRaw);
  if (j === null) {
    return "(could not parse `gh pr view --json statusCheckRollup`)\n";
  }
  if (typeof j === "object" && "statusCheckRollup" in j) {
    const out: string[] = [];
    collectCheckLines(
      (j as { statusCheckRollup: unknown }).statusCheckRollup,
      out,
      0,
    );
    const body =
      out.length > 0
        ? [...new Set(out)].sort().join("\n")
        : "(no name/state lines parsed in statusCheckRollup)";
    return body + "\n";
  }
  return "(unexpected `gh pr view` JSON shape for statusCheckRollup)\n";
}
