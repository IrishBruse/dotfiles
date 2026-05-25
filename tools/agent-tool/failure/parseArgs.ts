/// <reference types="node" />

export type ParseFailureResult =
  | { ok: true; summary: string; skills: string[] }
  | { ok: false; error: string };

function splitSkills(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Deduplicate while preserving first-seen order. */
function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function parseFailureArgs(argv: string[]): ParseFailureResult {
  const summaryParts: string[] = [];
  const skills: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--skills") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) {
        return { ok: false, error: "failure: --skills must be followed by a comma-separated list" };
      }
      i++;
      skills.push(...splitSkills(v));
      continue;
    }
    if (a.startsWith("--skills=")) {
      const rest = a.slice("--skills=".length);
      if (rest.length === 0) {
        return { ok: false, error: "failure: --skills= needs a non-empty comma-separated list" };
      }
      skills.push(...splitSkills(rest));
      continue;
    }
    summaryParts.push(a);
  }

  return {
    ok: true,
    summary: summaryParts.join(" ").trim(),
    skills: dedupeSkills(skills),
  };
}
