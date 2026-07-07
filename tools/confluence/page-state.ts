import { findRelativeMdLinks } from "./links.ts";
import { hashBody } from "./local.ts";

export type PageStatus = "clean" | "modified" | "behind" | "links";

export type PageChangeState = {
  behind: boolean;
  modified: boolean;
  hasBadLinks: boolean;
};

/** Compare local frontmatter and body to the remote Confluence version. */
export function pageChangeState(
  localVersion: number,
  remoteVersion: number,
  syncedHash: string,
  body: string
): PageChangeState {
  return {
    hasBadLinks: findRelativeMdLinks(body).length > 0,
    behind: remoteVersion > localVersion,
    modified: Boolean(syncedHash && hashBody(body) !== syncedHash)
  };
}

/** Single status label for `confluence status` (first match wins). */
export function classifyPage(
  localVersion: number,
  remoteVersion: number,
  syncedHash: string,
  body: string
): PageStatus {
  const state = pageChangeState(localVersion, remoteVersion, syncedHash, body);
  if (state.hasBadLinks) return "links";
  if (state.behind) return "behind";
  if (state.modified) return "modified";
  return "clean";
}

export type SyncDecision = "pull" | "push" | "noop" | "conflict" | "links";

/**
 * Choose pull, push, or noop from local change flags and timestamps.
 * When both sides changed, the newer mtime wins; ties become conflict.
 */
export function decideSync(
  state: PageChangeState,
  fileMtimeMs: number,
  remoteUpdatedAt?: string
): SyncDecision {
  if (state.hasBadLinks) return "links";
  if (!state.behind && !state.modified) return "noop";
  if (state.behind && !state.modified) return "pull";
  if (state.modified && !state.behind) return "push";

  if (remoteUpdatedAt) {
    const remoteMs = Date.parse(remoteUpdatedAt);
    if (!Number.isNaN(remoteMs)) {
      if (remoteMs > fileMtimeMs) return "pull";
      if (fileMtimeMs > remoteMs) return "push";
    }
  }

  return "conflict";
}
