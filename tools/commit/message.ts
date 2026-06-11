import { analyzeStagedChanges, isConfidentEnough } from "./analyze.ts";
import { loadCommitConfig } from "./config.ts";
import {
  expandMessage,
  findConfigMatch,
  resolveFallbackMessage
} from "./matchConfig.ts";

export interface CommitMessageResult {
  message: string;
  confident: boolean;
}

export function generateCommitMessage(
  repoRoot: string,
  nameStatus: string,
  diff: string,
  stagedPaths: string[]
): CommitMessageResult {
  const analysis = analyzeStagedChanges(nameStatus, diff);
  const vars = {
    summary: analysis.summary,
    type: analysis.type,
    scope: analysis.scope,
    name: undefined as string | undefined
  };

  const config = loadCommitConfig(repoRoot);
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

  const message = config?.fallback
    ? resolveFallbackMessage(config, vars)
    : analysis.subject;
  return { message, confident: true };
}

/** Message for a subset of staged paths (same diff; paths filter scope matching). */
export function generateCommitMessageForPaths(
  repoRoot: string,
  nameStatus: string,
  diff: string,
  paths: string[]
): CommitMessageResult {
  return generateCommitMessage(repoRoot, nameStatus, diff, paths);
}
