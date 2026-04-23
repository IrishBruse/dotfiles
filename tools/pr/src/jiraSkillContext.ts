import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JIRA_KEY_RE = /\b([A-Z][A-Z0-9]{1,20}-\d+)\b/g;

function stripYamlFrontmatter(md: string): string {
  if (!md.startsWith("---\n")) {
    return md;
  }
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) {
    return md;
  }
  return md.slice(end + 5);
}

function skillRootCandidates(): string[] {
  const fromEnv = process.env.PR_JIRA_SKILL_DIR?.trim();
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fromRepo = path.join(
    scriptDir,
    "..",
    "..",
    "..",
    ".agents/skills/jira-tickets",
  );
  const fromHome = path.join(os.homedir(), ".agents/skills/jira-tickets");
  const out: string[] = [];
  if (fromEnv) {
    out.push(fromEnv);
  }
  out.push(fromRepo, fromHome);
  return out;
}

function resolveSkillRoot(): string | null {
  for (const root of skillRootCandidates()) {
    if (fs.existsSync(path.join(root, "SKILL.md"))) {
      return root;
    }
  }
  return null;
}

function jiraKeysFromText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(JIRA_KEY_RE);
  while ((m = re.exec(text)) !== null) {
    const k = m[1]!;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function readTicketRef(skillRoot: string, key: string): string | null {
  const subdirs = ["me", "team", "unassigned"] as const;
  for (const sub of subdirs) {
    const p = path.join(skillRoot, "references", sub, `${key}.md`);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8");
    }
  }
  return null;
}

/**
 * Writes `jira.md` in `dir` from the jira-tickets skill (ticket refs and/or board).
 * No network; skips silently if no skill on disk.
 */
export function writeJiraSkillContext(dir: string, prBody: string): void {
  const keys = jiraKeysFromText(prBody);
  if (keys.length === 0) {
    return;
  }

  const skillRoot = resolveSkillRoot();
  if (skillRoot === null) {
    return;
  }

  const sections: string[] = [];

  for (const key of keys) {
    const ref = readTicketRef(skillRoot, key);
    if (ref !== null) {
      sections.push(`## ${key} (from skill references)\n\n${ref.trim()}\n`);
    }
  }

  if (sections.length === 0) {
    const skillMd = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
    sections.push(
      `## Jira board (skill fallback — no references/**/${keys.join(", ")}.md)\n\n${stripYamlFrontmatter(skillMd).trim()}\n`,
    );
  }

  fs.writeFileSync(
    path.join(dir, "jira.md"),
    sections.join("\n---\n\n") + "\n",
    "utf8",
  );
}
