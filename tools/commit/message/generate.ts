import { analyzeStagedChanges, isConfidentEnough } from "./analyze.ts";
import type { CommitConfig } from "../config/config.ts";
import { loadCommitConfig } from "../config/config.ts";
import { findConfigMatch, formatCommitMessage } from "../config/match.ts";

export interface CommitMessageResult {
  message: string;
  confident: boolean;
}

export function generateCommitMessage(
  repoRoot: string,
  nameStatus: string,
  diff: string,
  stagedPaths: string[],
  config: CommitConfig | undefined = loadCommitConfig(repoRoot)
): CommitMessageResult {
  const analysis = analyzeStagedChanges(nameStatus, diff);

  const match = config ? findConfigMatch(config, stagedPaths) : undefined;
  if (match) {
    const message = formatCommitMessage(
      match.rule,
      match.capturedScope,
      analysis.summary
    );
    const confident =
      analysis.summary !== "" && isConfidentEnough(analysis);
    return { message: confident ? message : "", confident };
  }

  const confident = isConfidentEnough(analysis);
  if (!confident) {
    return { message: "", confident: false };
  }

  return {
    message: `${analysis.type}(${analysis.scope}): ${analysis.summary}`,
    confident: true
  };
}
