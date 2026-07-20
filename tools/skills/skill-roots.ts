/**
 * Skill container paths aligned with skills.sh discovery and agent install targets.
 * @see https://github.com/vercel-labs/skills
 */

/** Project-relative skill container suffixes (walked from cwd up to filesystem root). */
export const PROJECT_SKILL_ROOT_SUFFIXES = [
  [".aider-desk", "skills"],
  [".adal", "skills"],
  [".agents", "skills"],
  [".autohand", "skills"],
  [".augment", "skills"],
  [".bob", "skills"],
  [".claude", "skills"],
  [".codeartsdoer", "skills"],
  [".codebuddy", "skills"],
  [".codemaker", "skills"],
  [".codestudio", "skills"],
  [".commandcode", "skills"],
  [".continue", "skills"],
  [".cortex", "skills"],
  [".crush", "skills"],
  [".cursor", "skills"],
  [".devin", "skills"],
  [".factory", "skills"],
  [".forge", "skills"],
  [".goose", "skills"],
  [".hermes", "skills"],
  [".iflow", "skills"],
  [".inferencesh", "skills"],
  [".jazz", "skills"],
  [".junie", "skills"],
  [".kilocode", "skills"],
  [".kiro", "skills"],
  [".kode", "skills"],
  [".lingma", "skills"],
  [".mcpjam", "skills"],
  [".moxby", "skills"],
  [".mux", "skills"],
  [".neovate", "skills"],
  [".ona", "skills"],
  [".opencode", "skills"],
  [".openhands", "skills"],
  [".pi", "skills"],
  [".pochi", "skills"],
  [".qoder", "skills"],
  [".qwen", "skills"],
  [".reasonix", "skills"],
  [".rovodev", "skills"],
  [".roo", "skills"],
  [".tabnine", "agent", "skills"],
  [".terramind", "skills"],
  [".tinycloud", "skills"],
  [".trae", "skills"],
  [".vibe", "skills"],
  [".windsurf", "skills"],
  [".zcode", "skills"],
  [".zencoder", "skills"],
  ["agent", "skills"],
  ["data", "skills"],
  ["skills"],
] as const;

/**
 * Home-relative skill container suffixes that do not mirror a project path under ~/.
 * Project paths above are still scanned globally as ~/.foo/skills.
 */
export const GLOBAL_ONLY_SKILL_ROOT_SUFFIXES = [
  [".astrbot", "data", "skills"],
  [".codeium", "windsurf", "skills"],
  [".codex", "skills"],
  [".config", "agents", "skills"],
  [".config", "crush", "skills"],
  [".config", "devin", "skills"],
  [".config", "goose", "skills"],
  [".config", "opencode", "skills"],
  [".copilot", "skills"],
  [".deepagents", "agent", "skills"],
  [".firebender", "skills"],
  [".gemini", "antigravity", "skills"],
  [".gemini", "antigravity-cli", "skills"],
  [".gemini", "skills"],
  [".openclaw", "skills"],
  [".pi", "agent", "skills"],
  [".qoder-cn", "skills"],
  [".snowflake", "cortex", "skills"],
  [".trae-cn", "skills"],
] as const;

export const CURSOR_BUILTIN_SKILL_ROOT_SUFFIX = [".cursor", "skills-cursor"] as const;

function suffixKey(suffix: readonly string[]): string {
  return suffix.join("\0");
}

function dedupeSuffixes(
  suffixes: readonly (readonly string[])[]
): readonly (readonly string[])[] {
  const seen = new Set<string>();
  const out: (readonly string[])[] = [];
  for (const suffix of suffixes) {
    const key = suffixKey(suffix);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(suffix);
  }
  return out;
}

/** Project skill roots plus optional Cursor built-in skills. */
export function projectSkillRootSuffixes(
  options: { includeCursorBuiltin?: boolean } = {}
): readonly (readonly string[])[] {
  if (options.includeCursorBuiltin) {
    return dedupeSuffixes([
      ...PROJECT_SKILL_ROOT_SUFFIXES,
      CURSOR_BUILTIN_SKILL_ROOT_SUFFIX,
    ]);
  }
  return PROJECT_SKILL_ROOT_SUFFIXES;
}

/** Global skill roots: mirrored project paths under ~/ plus global-only install targets. */
export function globalSkillRootSuffixes(
  options: { includeCursorBuiltin?: boolean } = {}
): readonly (readonly string[])[] {
  return dedupeSuffixes([
    ...PROJECT_SKILL_ROOT_SUFFIXES,
    ...GLOBAL_ONLY_SKILL_ROOT_SUFFIXES,
    ...(options.includeCursorBuiltin ? [CURSOR_BUILTIN_SKILL_ROOT_SUFFIX] : []),
  ]);
}
