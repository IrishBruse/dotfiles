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

/** At most one key from the title line (first match in `title` only). */
function jiraKeyFromTitle(title: string): string | undefined {
  return jiraKeysFromText(title)[0];
}

/**
 * First key from `prTitle` (if any) plus all keys in `prBody` in order, deduped.
 * Title key wins first so a body mention of the same key does not reorder.
 */
function jiraRefKeysForTitleAndBody(prTitle: string, prBody: string): string[] {
  const fromTitle = jiraKeyFromTitle(prTitle);
  const fromBody = jiraKeysFromText(prBody);
  const out: string[] = [];
  const seen = new Set<string>();
  if (fromTitle !== undefined) {
    out.push(fromTitle);
    seen.add(fromTitle);
  }
  for (const k of fromBody) {
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
 * Copies full ticket files from the jira-tickets skill for: the **first** Jira key in **`prTitle`** (e.g. GitHub PR
 * title) if any, **plus** every distinct key in **`prBody`**, in that order. Does **not** copy every key that appears
 * on `jira-tickets-board.md` — that file is for context only. For **`pr create`**, pass the current **branch** as
 * `prTitle` and an optional **template** body. Searches `references/{me,team,unassigned}/{KEY}.md`. If at least one
 * key was expected but no reference file exists for any, writes `{firstKey}.md` with the skill `SKILL.md` body
 * (frontmatter stripped). No network; no-op if no keys or no skill on disk.
 */
export function writeJiraSkillContext(
  dir: string,
  prTitle: string,
  prBody: string,
): void {
  const keys = jiraRefKeysForTitleAndBody(prTitle, prBody);
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

/** Snapshot of the jira-tickets skill board (`SKILL.md` body, frontmatter stripped) as **`jira-tickets-board.md`**. No-op if skill missing. */
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
}
