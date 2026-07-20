import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, containsDisallowedXmlTags, lint } from "./frontmatter-fields.ts";

const SKILL_PATH = "/tmp/demo/SKILL.md";

describe("frontmatter-fields lint", () => {
  it("flags invalid name and description fields", () => {
    const content = `---
name: Bad_Name
description: I can help you process Excel files.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.code === "frontmatter-name")
    );
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.code === "description-voice")
    );
  });

  it("flags vague skill names", () => {
    const content = `---
name: helper
description: Processes helper tasks. Use when the user mentions helpers.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.code === "vague-skill-name")
    );
  });

  it("flags invalid indented description format", () => {
    const content = `---
name: demo-skill
description:
  First line of description.
  Second line of description.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.equal(diagnostics[0]?.code, "frontmatter-description");
    assert.equal(diagnostics[0]?.severity, "error");
  });

  it("flags orphan frontmatter lines after description", () => {
    const content = `---
name: demo-skill
description: First sentence only.
Second sentence should be in the description string.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.code === "frontmatter-orphan")
    );
  });

  it("reads multiline quoted descriptions", () => {
    const content = `---
name: demo-skill
description: 'First sentence.
Use when the user mentions demos.'
---

# Demo
`;
    assert.deepEqual(lint(content, SKILL_PATH), []);
  });

  it("flags overlong frontmatter values", () => {
    const longName = "a".repeat(MAX_NAME_LENGTH + 1);
    const longDescription = "b".repeat(MAX_DESCRIPTION_LENGTH + 1);
    const content = `---
name: ${longName}
description: ${longDescription}
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "frontmatter-name" &&
          diagnostic.severity === "error"
      )
    );
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "frontmatter-description" &&
          diagnostic.severity === "error"
      )
    );
  });

  it("ignores non-SKILL markdown files", () => {
    const content = `---
name: helper
description:
---

# Demo
`;
    assert.deepEqual(lint(content, "/tmp/demo/reference.md"), []);
  });

  it("allows path placeholders such as test/<id> in description", () => {
    const content = `---
name: demo-skill
description: Validates files under test/<id> paths. Use when the user edits path templates.
---

# Demo
`;
    assert.deepEqual(lint(content, SKILL_PATH), []);
    assert.equal(containsDisallowedXmlTags("test/<id>"), false);
    assert.equal(containsDisallowedXmlTags("jira/<type>/"), false);
  });

  it("flags real XML-like tags in description", () => {
    const content = `---
name: demo-skill
description: Use <important> tags when writing summaries. Use when formatting output.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "frontmatter-description" &&
          diagnostic.message.includes("XML tags")
      )
    );
    assert.equal(containsDisallowedXmlTags("<important>"), true);
    assert.equal(containsDisallowedXmlTags('<note attr="x">'), true);
    assert.equal(containsDisallowedXmlTags("</note>"), true);
  });
});
