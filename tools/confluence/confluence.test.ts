import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { storageToMarkdown } from "./confluence-storage-to-markdown.ts";
import { slugifyConfluenceTitle } from "./confluence-slug.ts";
import { findRelativeMdLinks } from "./links.ts";
import { hashBody, pageUrl, resolvePageFilePath } from "./local.ts";
import { markdownToStorage } from "./markdown-to-storage.ts";
import { parsePageId, parseJiraKey } from "./page-input.ts";
import { decideSync, pageChangeState } from "./page-state.ts";

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

  it("emits full wiki URLs for page links", () => {
    const md = storageToMarkdown(
      '<ac:link><ri:page ri:space-key="GPARCH" ri:content-title="Foo Bar" ri:content-id="123" /><ac:link-body>Foo Bar</ac:link-body></ac:link>',
      { siteHost: "example.atlassian.net" }
    );
    assert.match(md, /https:\/\/example\.atlassian\.net\/wiki\/spaces\/GPARCH\/pages\/123\//);
    assert.doesNotMatch(md, /\.md\)/);
  });

  it("emits Jira browse URLs for issue links", () => {
    const md = storageToMarkdown(
      '<ac:link><ri:issue ri:issue-key="NOVACORE-1" /><ac:link-body>NOVACORE-1</ac:link-body></ac:link>',
      { siteHost: "example.atlassian.net" }
    );
    assert.match(md, /https:\/\/example\.atlassian\.net\/browse\/NOVACORE-1/);
  });
});

describe("links", () => {
  it("detects relative markdown links", () => {
    const hits = findRelativeMdLinks("See [other](./other-page.md) for details.");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.href, "./other-page.md");
  });

  it("ignores absolute URLs", () => {
    const hits = findRelativeMdLinks(
      "See [Jira](https://example.atlassian.net/browse/NOVACORE-1)."
    );
    assert.equal(hits.length, 0);
  });
});

describe("page-input", () => {
  it("parses page ids from wiki URLs", () => {
    assert.equal(
      parsePageId(
        "https://example.atlassian.net/wiki/spaces/GCE1/pages/4390912052/Title"
      ),
      "4390912052"
    );
  });

  it("parses Jira keys", () => {
    assert.equal(parseJiraKey("NOVACORE-42"), "NOVACORE-42");
    assert.equal(
      parseJiraKey("https://example.atlassian.net/browse/novacore-9"),
      "NOVACORE-9"
    );
  });
});

describe("local helpers", () => {
  it("prefers an explicit sync file path over confluence registry", () => {
    const cwd = "/tmp/workspace";
    const resolved = resolvePageFilePath(
      "1",
      cwd,
      "docs/guide.md"
    );
    assert.equal(resolved, "/tmp/workspace/docs/guide.md");
  });

  it("builds canonical page URLs", () => {
    const url = pageUrl("example.atlassian.net", "GCE1", "1", "Hello World");
    assert.equal(
      url,
      "https://example.atlassian.net/wiki/spaces/GCE1/pages/1/Hello%2BWorld"
    );
  });

  it("hashes body content", () => {
    assert.equal(hashBody("alpha"), hashBody("alpha"));
    assert.notEqual(hashBody("alpha"), hashBody("beta"));
  });
});

describe("page-state", () => {
  it("detects behind and modified independently", () => {
    const hash = hashBody("body");
    assert.deepEqual(
      pageChangeState(1, 2, hash, "body"),
      { behind: true, modified: false, hasBadLinks: false }
    );
    assert.deepEqual(
      pageChangeState(2, 2, hash, "edited"),
      { behind: false, modified: true, hasBadLinks: false }
    );
    assert.deepEqual(
      pageChangeState(1, 2, hash, "edited"),
      { behind: true, modified: true, hasBadLinks: false }
    );
  });

  it("chooses pull or push from change flags", () => {
    const clean = { behind: false, modified: false, hasBadLinks: false };
    const behind = { behind: true, modified: false, hasBadLinks: false };
    const modified = { behind: false, modified: true, hasBadLinks: false };
    const both = { behind: true, modified: true, hasBadLinks: false };

    assert.equal(decideSync(clean, 0), "noop");
    assert.equal(decideSync(behind, 0), "pull");
    assert.equal(decideSync(modified, 0), "push");
    assert.equal(
      decideSync(both, 100, "1970-01-01T00:00:01.000Z"),
      "pull"
    );
    assert.equal(
      decideSync(both, 200, "1970-01-01T00:00:00.000Z"),
      "push"
    );
    assert.equal(decideSync(both, 100), "conflict");
  });
});

describe("markdownToStorage", () => {
  it("converts headings and paragraphs", () => {
    const storage = markdownToStorage("# Title\n\nHello there.", "example.atlassian.net");
    assert.match(storage, /<h1>Title<\/h1>/);
    assert.match(storage, /<p>Hello there\.<\/p>/);
  });
});
