import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { markdown } from "./api.ts";
import { collectLinkRefs, isLinkRefDefLine } from "./links.ts";

describe("collectLinkRefs", () => {
  it("parses reference-style link definitions", () => {
    const refs = collectLinkRefs("[Docs]: https://example.com/docs\n");
    assert.equal(refs.get("docs"), "https://example.com/docs");
  });
});

describe("isLinkRefDefLine", () => {
  it("detects reference definition lines", () => {
    assert.equal(isLinkRefDefLine("[label]: /path"), true);
    assert.equal(isLinkRefDefLine("# heading"), false);
  });
});

describe("markdown", () => {
  it("renders headings and paragraphs", () => {
    const out = markdown("# Title\n\nHello world.");
    assert.match(out, /Title/);
    assert.match(out, /Hello world/);
  });

  it("renders bullet lists", () => {
    const out = markdown("- one\n- two");
    assert.match(out, /one/);
    assert.match(out, /two/);
  });
});
