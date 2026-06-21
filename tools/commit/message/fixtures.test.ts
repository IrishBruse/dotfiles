import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadCommitConfig } from "../config/config.ts";
import { parseNameStatus } from "../diff/parse.ts";
import { generateCommitMessage } from "./generate.ts";
import { planPrSplit } from "../split/plan.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const config = loadCommitConfig(repoRoot);

interface FixtureCase {
  id: string;
  paths: string[];
  nameStatus: string;
  diff: string;
  expected: string;
}

const cases = JSON.parse(
  readFileSync(join(here, "fixtures/cases.json"), "utf8")
) as FixtureCase[];

describe("generateCommitMessage fixtures", () => {
  for (const fixture of cases) {
    it(`${fixture.id} -> ${fixture.expected}`, () => {
      const result = generateCommitMessage(
        repoRoot,
        fixture.nameStatus,
        fixture.diff,
        fixture.paths,
        config
      );
      assert.equal(result.confident, true);
      assert.equal(result.message, fixture.expected);
    });
  }

  it("rejects empty staged changes", () => {
    const result = generateCommitMessage(repoRoot, "", "", [], config);
    assert.equal(result.confident, false);
    assert.equal(result.message, "");
  });
});

describe("misc slice messages", () => {
  it("gitignore change uses misc update subject", () => {
    const nameStatus = "M\t.gitignore\n";
    const diff = [
      "diff --git a/.gitignore b/.gitignore",
      "index abc..def 100644",
      "--- a/.gitignore",
      "+++ b/.gitignore",
      "@@ -1 +1,2 @@",
      "+commit.config.json",
      " node_modules"
    ].join("\n");
    const files = parseNameStatus(nameStatus);
    const slices = planPrSplit(repoRoot, nameStatus, diff, files, config);
    assert.equal(slices.length, 1);
    assert.equal(slices[0]!.message, "misc: update .gitignore");
  });
});
