import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSkillFrontmatter,
  skillDisplay,
  skillListSortRank,
} from "./frontmatter.ts";
import { formatSkillLines, wrapText } from "./ls-format.ts";

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

  it("parses nested metadata surfaces", () => {
    const parsed = parseSkillFrontmatter(`name: canvas
description: ''
metadata:
  surfaces:
    - ide`);

    const display = skillDisplay(parsed, "canvas");
    assert.deepEqual(display.fields, [{ key: "surfaces", value: "ide" }]);
    assert.equal(display.description, undefined);
  });
});

describe("skillDisplay", () => {
  it("maps disable-model-invocation to heading tags", () => {
    const userDisplay = skillDisplay(
      parseSkillFrontmatter(`name: handoff
description: Produces a full handoff summary so a fresh agent can continue the work.
disable-model-invocation: true`),
      "handoff"
    );

    assert.deepEqual(userDisplay.headingTags, [
      {
        key: "disable-model-invocation",
        value: "true",
        valueRole: "label",
        keyOnly: true,
      },
    ]);
    assert.equal(userDisplay.fields.length, 0);

    const modelDisplay = skillDisplay(
      parseSkillFrontmatter(`name: browser
description: Browser automation.`),
      "browser"
    );

    assert.deepEqual(modelDisplay.headingTags, []);
    assert.equal(modelDisplay.fields.length, 0);

    const explicitModelDisplay = skillDisplay(
      parseSkillFrontmatter(`name: browser
description: Browser automation.
disable-model-invocation: false`),
      "browser"
    );

    assert.deepEqual(explicitModelDisplay.headingTags, [
      {
        key: "disable-model-invocation",
        value: "false",
        valueRole: "dim",
        keyOnly: true,
      },
    ]);
    assert.equal(explicitModelDisplay.fields.length, 0);
  });

  it("shows user-invocable only when false", () => {
    const hidden = skillDisplay(
      parseSkillFrontmatter(`name: secret
description: Hidden skill.
user-invocable: false`),
      "secret"
    );

    assert.deepEqual(hidden.headingTags, [
      {
        key: "user-invocable",
        value: "false",
        valueRole: "bad",
        keyOnly: true,
      },
    ]);

    const explicit = skillDisplay(
      parseSkillFrontmatter(`name: public
description: Public skill.
user-invocable: true`),
      "public"
    );
    assert.deepEqual(explicit.headingTags, []);

    const defaultInvocable = skillDisplay(
      parseSkillFrontmatter(`name: public
description: Public skill.`),
      "public"
    );
    assert.deepEqual(defaultInvocable.headingTags, []);
  });

  it("ranks skills for ls output", () => {
    const userInvocableFalse = skillListSortRank(
      parseSkillFrontmatter(`user-invocable: false`)
    );
    const modelInvoked = skillListSortRank(
      parseSkillFrontmatter(`description: Model skill.`)
    );
    const explicitModel = skillListSortRank(
      parseSkillFrontmatter(`disable-model-invocation: false`)
    );
    const userInvoked = skillListSortRank(
      parseSkillFrontmatter(`disable-model-invocation: true`)
    );

    assert.ok(userInvocableFalse < userInvoked);
    assert.ok(userInvocableFalse < modelInvoked);
    assert.ok(userInvocableFalse < explicitModel);
    assert.ok(userInvoked < modelInvoked);
    assert.ok(userInvoked < explicitModel);
    assert.equal(modelInvoked, explicitModel);
  });
});

describe("wrapText", () => {
  it("wraps long lines with a fixed indent", () => {
    const lines = wrapText(
      "one two three four five six seven eight nine ten",
      20,
      "  "
    );
    assert.deepEqual(lines, [
      "  one two three four",
      "  five six seven",
      "  eight nine ten",
    ]);
  });
});

describe("formatSkillLines", () => {
  it("prints metadata fields under the skill name", () => {
    const lines = formatSkillLines(
      {
        description: "Short description.",
        headingTags: [
          {
            key: "disable-model-invocation",
            value: "false",
            valueRole: "dim",
            keyOnly: true,
          },
        ],
        fields: [{ key: "surfaces", value: "ide" }],
      },
      "canvas",
      80
    );
    assert.match(lines[0]!, /canvas/);
    assert.match(lines[0]!, /disable-model-invocation/);
    assert.doesNotMatch(lines[0]!, /\bfalse\b/);
    assert.match(lines[1]!, /surfaces/);
    assert.match(lines[1]!, /ide/);
    assert.match(lines[2]!, /Short description/);
  });

  it("prints key-only heading tags in the value color", () => {
    const lines = formatSkillLines(
      {
        headingTags: [
          {
            key: "user-invocable",
            value: "false",
            valueRole: "bad",
            keyOnly: true,
          },
        ],
        fields: [],
      },
      "secret",
      80
    );
    assert.match(lines[0]!, /secret/);
    assert.match(lines[0]!, /user-invocable/);
    assert.doesNotMatch(lines[0]!, /false/);
  });
});
