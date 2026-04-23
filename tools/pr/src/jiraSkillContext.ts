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
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fromRepo = path.join(
    scriptDir,
    "..",
    "..",
    "..",
    ".agents/skills/jira-tickets",
  );
  const fromHome = path.join(os.homedir(), ".agents/skills/jira-tickets");
  return [fromRepo, fromHome];
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

function resolveTicketRefPath(skillRoot: string, key: string): string | null {
  const subdirs = ["me", "team", "unassigned"] as const;
  for (const sub of subdirs) {
    const p = path.join(skillRoot, "references", sub, `${key}.md`);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/** Copies each `references/{me,team,unassigned}/{KEY}.md` to `{KEY}.md` in `dir` when that file exists. Returns how many were copied. */
function copyJiraRefFilesForKeys(
  skillRoot: string,
  dir: string,
  keys: string[],
): number {
  let copied = 0;
  for (const key of keys) {
    const src = resolveTicketRefPath(skillRoot, key);
    if (src !== null) {
      fs.copyFileSync(src, path.join(dir, `${key}.md`));
      copied += 1;
    }
  }
  return copied;
}

/**
 * For each Jira key in the PR body, copies the skill reference file to `{KEY}.md` in `dir` (exact bytes, no extra headers).
 * Searches `references/me|team/unassigned/{KEY}.md` under the skill root.
 * If no reference file exists for any key, writes `{firstKey}.md` with the skill `SKILL.md` body only (frontmatter stripped).
 * No network; skips silently if no keys or no skill on disk.
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

  const copied = copyJiraRefFilesForKeys(skillRoot, dir, keys);

  if (copied === 0) {
    const skillPath = path.join(skillRoot, "SKILL.md");
    const body = stripYamlFrontmatter(fs.readFileSync(skillPath, "utf8")).trim();
    fs.writeFileSync(path.join(dir, `${keys[0]}.md`), body + "\n", "utf8");
  }
}

/**
 * Snapshot of the jira-tickets skill board (`SKILL.md` body, frontmatter stripped) in **`jira-tickets-board.md`**, and for
 * every issue key in that text, the full reference ticket file when present at **`references/me|team/unassigned/{KEY}.md`**
 * copied to **`{KEY}.md`** (same as {@link writeJiraSkillContext}, without the no-reference fallback). No-op if skill missing.
 */
export function writeJiraSkillBoardSnapshot(dir: string): void {
  const skillRoot = resolveSkillRoot();
  if (skillRoot === null) {
    return;
  }
  const skillPath = path.join(skillRoot, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    return;
  }
  const body = stripYamlFrontmatter(fs.readFileSync(skillPath, "utf8")).trim();
  fs.writeFileSync(path.join(dir, "jira-tickets-board.md"), body + "\n", "utf8");
  const keys = jiraKeysFromText(body);
  copyJiraRefFilesForKeys(skillRoot, dir, keys);
}
