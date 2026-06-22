import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildManagedCrontab } from "./cron.ts";

describe("buildManagedCrontab", () => {
  it("adds managed jobs without removing unmanaged entries", () => {
    const existing = "15 9 * * * echo personal\n";
    const jobs = "0 * * * * jira sync\n";

    assert.equal(
      buildManagedCrontab(existing, jobs),
      `15 9 * * * echo personal

# BEGIN dotfiles managed cron
0 * * * * jira sync
# END dotfiles managed cron
`
    );
  });

  it("replaces the previous managed block", () => {
    const existing = `15 9 * * * echo personal

# BEGIN dotfiles managed cron
0 8 * * * old-job
# END dotfiles managed cron
`;
    const jobs = "0 * * * * jira sync\n";

    assert.equal(
      buildManagedCrontab(existing, jobs),
      `15 9 * * * echo personal

# BEGIN dotfiles managed cron
0 * * * * jira sync
# END dotfiles managed cron
`
    );
  });
});
