import { pullAll } from "./pull.ts";

/** Run `jira sync` (re-pull all local tickets). */
export async function runSyncCommand(): Promise<number> {
  return pullAll();
}
