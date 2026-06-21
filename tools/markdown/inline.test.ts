import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseInline, plainInlineLength } from "./inline.ts";

describe("parseInline", () => {
  it("parses bold, code, and links", () => {
    const refs = new Map([["docs", "https://example.com"]]);
    const spans = parseInline("read **bold** and `code` and [Docs][docs]", refs);
    assert.deepEqual(
      spans.map((span) => ({ style: span.style, text: span.text, url: span.url })),
      [
        { style: "body", text: "read ", url: undefined },
        { style: "bold", text: "bold", url: undefined },
        { style: "body", text: " and ", url: undefined },
        { style: "code", text: "code", url: undefined },
        { style: "body", text: " and ", url: undefined },
        { style: "link", text: "Docs", url: "https://example.com" }
      ]
    );
  });
});

describe("plainInlineLength", () => {
  it("counts visible characters without markdown syntax", () => {
    assert.equal(plainInlineLength("**bold** text"), "bold text".length);
  });
});
