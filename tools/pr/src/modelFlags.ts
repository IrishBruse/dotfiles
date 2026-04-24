/** Default when neither `--opus` nor `--codex` is set (must match a slug from `agent --list-models`). */
export const PR_AGENT_DEFAULT_MODEL = "composer-2";

const PR_OPUS_MODEL = "claude-opus-4-7-high";
const PR_CODEX_MODEL = "gpt-5.3-codex";

/** Human-readable model name for `> Reviewed by Cursor (…)` in PR review comments. */
export const PR_REVIEW_MODEL_LABEL_DEFAULT = "Composer 2";
const PR_REVIEW_MODEL_LABEL_OPUS = "Claude Opus 4.7 (high)";
const PR_REVIEW_MODEL_LABEL_CODEX = "Codex 5.3";

/** Strips `--opus` / `--codex` and returns the agent model slug. */
export function takeModelFlags(args: string[]): {
  rest: string[];
  model: string;
  /** Matches which of `--opus`, `--codex`, or neither was passed to `pr review`. */
  reviewModelLabel: string;
} {
  const hasOpus = args.includes("--opus");
  const hasCodex = args.includes("--codex");
  const rest = args.filter((a) => a !== "--opus" && a !== "--codex");
  if (hasOpus && hasCodex) {
    throw new Error("pr: use at most one of --opus, --codex");
  }
  if (hasOpus) {
    return {
      rest,
      model: PR_OPUS_MODEL,
      reviewModelLabel: PR_REVIEW_MODEL_LABEL_OPUS,
    };
  }
  if (hasCodex) {
    return {
      rest,
      model: PR_CODEX_MODEL,
      reviewModelLabel: PR_REVIEW_MODEL_LABEL_CODEX,
    };
  }
  return {
    rest,
    model: PR_AGENT_DEFAULT_MODEL,
    reviewModelLabel: PR_REVIEW_MODEL_LABEL_DEFAULT,
  };
}
