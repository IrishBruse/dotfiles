import { analyzeStagedChanges, isConfidentEnough } from "./analyze.ts";
import type { CommitConfig } from "../config/config.ts";
import { loadCommitConfig } from "../config/config.ts";
import { expandMessage, findConfigMatch } from "../config/match.ts";
import type { MessageVars } from "../types.ts";

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
  const vars: MessageVars = {
    summary: analysis.summary,
    type: analysis.type,
    scope: analysis.scope
  };

  const match = config ? findConfigMatch(config, stagedPaths) : undefined;
  if (match) {
    vars.name = match.name;
    return {
      message: expandMessage(match.message, vars),
      confident: true
    };
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
