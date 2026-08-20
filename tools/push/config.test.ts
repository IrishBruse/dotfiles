import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchGlob, planSlices, type Rule } from "./config.ts";
import type { Change } from "./git.ts";

const rules: Rule[] = [
  { globs: ["home/.agents/skills/*/:scope/**"], prefix: "skill" },
  { globs: ["tools/:scope/**"], prefix: "tools" },
  { globs: ["linux/**"], prefix: "linux" },
  { globs: ["commit.config.json"], prefix: "config", scope: "commit" }
];

function change(path: string, status: Change["status"] = "M"): Change {
  return { status, path };
}

describe("matchGlob", () => {
  it("captures :scope", () => {
    const hit = matchGlob("tools/push/main.ts", "tools/:scope/**");
    assert.equal(hit.matched, true);
    assert.equal(hit.scope, "push");
  });

  it("rejects a non-match", () => {
    assert.equal(matchGlob("src/app.ts", "tools/:scope/**").matched, false);
  });
});

describe("planSlices", () => {
  it("groups by captured scope", () => {
    const slices = planSlices(
      [change("tools/push/main.ts"), change("tools/jira/main.ts")],
      rules
    );
    assert.deepEqual(
      slices.map((s) => s.message).sort(),
      ["tools(jira): update main.ts", "tools(push): update main.ts"]
    );
  });

  it("uses document rule workflow for SKILL.md", () => {
    const slices = planSlices(
      [change("home/.agents/skills/github/push/SKILL.md")],
      rules
    );
    assert.equal(slices[0]?.message, "skill(push): document rule workflow");
  });

  it("uses remove scope files for deletes", () => {
    const slices = planSlices(
      [change("tools/commit/main.ts", "D")],
      rules
    );
    assert.equal(slices[0]?.message, "tools(commit): remove commit files");
  });

  it("falls back to misc for unmatched paths", () => {
    const slices = planSlices([change("Justfile")], rules);
    assert.equal(slices[0]?.message, "misc: update Justfile");
  });
});
