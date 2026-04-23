/** Default when neither `--opus` nor `--codex` is set (must match a slug from `agent --list-models`). */
export const PR_AGENT_DEFAULT_MODEL = "composer-2-fast";

const PR_OPUS_MODEL = "claude-opus-4-7-high";
const PR_CODEX_MODEL = "gpt-5.3-codex";

/** Strips `--opus` / `--codex` and returns the agent model slug. */
export function takeModelFlags(args: string[]): {
  rest: string[];
  model: string;
} {
  const hasOpus = args.includes("--opus");
  const hasCodex = args.includes("--codex");
  const rest = args.filter((a) => a !== "--opus" && a !== "--codex");
  if (hasOpus && hasCodex) {
    throw new Error("pr: use at most one of --opus, --codex");
  }
  if (hasOpus) {
    return { rest, model: PR_OPUS_MODEL };
  }
  if (hasCodex) {
    return { rest, model: PR_CODEX_MODEL };
  }
  return { rest, model: PR_AGENT_DEFAULT_MODEL };
}
