import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  frontmatterDisplayFields,
  parseSkillFrontmatter,
} from "./frontmatter.ts";

describe("parseSkillFrontmatter", () => {
  it("parses quoted and plain scalars", () => {
    const parsed = parseSkillFrontmatter(`name: browser
description: 'Browser automation via agent-browser CLI.'
disable-model-invocation: true`);

    assert.deepEqual(parsed.entries, [
      { key: "name", value: "browser" },
      {
        key: "description",
        value: "Browser automation via agent-browser CLI.",
      },
      { key: "disable-model-invocation", value: true },
    ]);
  });

  it("parses folded block descriptions", () => {
    const parsed = parseSkillFrontmatter(`name: babysit
description: >-
  Keep a PR merge-ready by triaging comments, resolving clear conflicts, and
  fixing CI in a loop.`);

    assert.equal(parsed.entries[1]?.key, "description");
    assert.equal(
      parsed.entries[1]?.value,
      "Keep a PR merge-ready by triaging comments, resolving clear conflicts, and fixing CI in a loop."
    );
  });
});

describe("frontmatterDisplayFields", () => {
  it("hides duplicate name and maps invocation", () => {
    const fields = frontmatterDisplayFields(
      parseSkillFrontmatter(`name: handoff
description: Produces a full handoff summary so a fresh agent can continue the work.
disable-model-invocation: true`),
      "handoff"
    );

    assert.deepEqual(fields, [
      {
        key: "description",
        value:
          "Produces a full handoff summary so a fresh agent can continue the work.",
      },
      { key: "invocation", value: "user" },
    ]);
  });
});
