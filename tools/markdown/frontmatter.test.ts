import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseFrontmatterEntries,
  renderFrontmatter,
  splitFrontmatter
} from "./frontmatter.ts";
import { markdown } from "./api.ts";

describe("splitFrontmatter", () => {
  it("splits YAML frontmatter from the body", () => {
    const { frontmatter, body } = splitFrontmatter(`---
title: Hello
---

# Heading
`);
    assert.equal(frontmatter, "title: Hello");
    assert.equal(body.trim(), "# Heading");
  });

  it("returns the full source when no frontmatter is present", () => {
    const source = "# Heading\n\n---\n";
    const { frontmatter, body } = splitFrontmatter(source);
    assert.equal(frontmatter, null);
    assert.equal(body, source);
  });
});

describe("parseFrontmatterEntries", () => {
  it("parses quoted and unquoted scalar values", () => {
    const entries = parseFrontmatterEntries(
      `name: jira
description: "Jira router that gates before any write."
url: https://example.com/browse/KEY-1`
    );
    assert.deepEqual(entries, [
      { key: "name", value: "jira" },
      {
        key: "description",
        value: "Jira router that gates before any write."
      },
      { key: "url", value: "https://example.com/browse/KEY-1" }
    ]);
  });
});

describe("renderFrontmatter", () => {
  it("uses delimiter, key, and value theme colors", () => {
    const out = renderFrontmatter('name: jira\ndescription: "Hello"');
    assert.match(out, /\x1b\[38;2;92;99;112m---/);
    assert.match(out, /\x1b\[38;2;224;108;117mname:/);
    assert.match(out, /\x1b\[38;2;152;195;121mjira/);
    assert.match(out, /\x1b\[38;2;224;108;117mdescription:/);
    assert.match(out, /\x1b\[38;2;152;195;121mHello/);
  });
});

describe("markdown with frontmatter", () => {
  it("renders frontmatter separately from the body", () => {
    const out = markdown(`---
title: "Fix login"
url: https://example.atlassian.net/browse/PROJ-7
status: todo
---

# Summary

Body text.
`);
    assert.match(out, /title:/);
    assert.match(out, /Fix login/);
    assert.match(out, /Summary/);
    assert.match(out, /Body text/);
    assert.doesNotMatch(out, /^[^\n]*─{10,}/);
  });

  it("still renders horizontal rules in the body", () => {
    const out = markdown("Intro\n\n---\n\nAfter rule");
    assert.match(out, /Intro/);
    assert.match(out, /After rule/);
    assert.match(out, /─{10,}/);
  });
});
