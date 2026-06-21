import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { slugifyConfluenceTitle } from "./confluence-slug.ts";
import { storageToMarkdown } from "./confluence-storage-to-markdown.ts";

describe("slugifyConfluenceTitle", () => {
  it("replaces unsafe characters and collapses whitespace", () => {
    assert.equal(slugifyConfluenceTitle("Foo / Bar: Baz"), "Foo---Bar--Baz");
  });

  it("trims leading and trailing hyphens", () => {
    assert.equal(slugifyConfluenceTitle("  --Hello--  "), "Hello");
  });
});

describe("storageToMarkdown", () => {
  it("converts simple storage HTML to markdown", () => {
    const md = storageToMarkdown("<p>Hello <strong>world</strong></p>");
    assert.match(md, /Hello/);
    assert.match(md, /world/);
  });

  it("preserves code blocks", () => {
    const md = storageToMarkdown(
      '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[const x = 1;]]></ac:plain-text-body></ac:structured-macro>'
    );
    assert.match(md, /const x = 1/);
  });
});
