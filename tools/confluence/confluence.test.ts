import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { storageToMarkdown } from "./lib/confluence-storage-to-markdown.ts";
import { slugifyConfluenceTitle } from "./lib/confluence-slug.ts";
import { formatPageMarkdown, spaceKeyFromWebui } from "./lib/format.ts";
import { assertNoRelativeMdLinks, findRelativeMdLinks } from "./lib/links.ts";
import {
  confluenceRootDir,
  defaultSiteHost,
  hashBody,
  jiraBrowseUrl,
  listLocalPages,
  localPagePath,
  pageUrl,
  parsePageMarkdown,
  resolvePageFilePath
} from "./lib/local.ts";
import { markdownToStorage } from "./lib/markdown-to-storage.ts";
import { parsePageId, parseJiraKey } from "./lib/pageInput.ts";
import {
  classifyPage,
  decideSync,
  pageChangeState
} from "./lib/page-state.ts";

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "confluence-test-"));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writePage(
  cwd: string,
  relPath: string,
  content: string
): string {
  const filePath = path.join(cwd, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("slugifyConfluenceTitle", () => {
  it("replaces unsafe characters and collapses whitespace", () => {
    assert.equal(slugifyConfluenceTitle("Foo / Bar: Baz"), "Foo---Bar--Baz");
  });

  it("trims leading and trailing hyphens", () => {
    assert.equal(slugifyConfluenceTitle("  --Hello--  "), "Hello");
  });

  it("caps length at 200 characters", () => {
    const long = "a".repeat(250);
    assert.equal(slugifyConfluenceTitle(long).length, 200);
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
    assert.match(
      md,
      /https:\/\/example\.atlassian\.net\/wiki\/spaces\/GPARCH\/pages\/123\//
    );
    assert.doesNotMatch(md, /\.md\)/);
  });

  it("emits Jira browse URLs for issue links", () => {
    const md = storageToMarkdown(
      '<ac:link><ri:issue ri:issue-key="PROJ-1" /><ac:link-body>PROJ-1</ac:link-body></ac:link>',
      { siteHost: "example.atlassian.net" }
    );
    assert.match(md, /https:\/\/example\.atlassian\.net\/browse\/PROJ-1/);
  });

  it("converts HTML lists and emphasis", () => {
    const md = storageToMarkdown(
      "<ul><li>One</li><li>Two</li></ul><p><em>Italic</em> and <strong>Bold</strong></p>"
    );
    assert.match(md, /One/);
    assert.match(md, /Two/);
    assert.match(md, /Italic/);
    assert.match(md, /Bold/);
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
      "See [Jira](https://example.atlassian.net/browse/PROJ-1)."
    );
    assert.equal(hits.length, 0);
  });

  it("throws on relative links when asserting", () => {
    assert.throws(
      () => assertNoRelativeMdLinks("[x](./y.md)", "doc.md"),
      /relative \.md links/
    );
  });

  it("detects reference-style relative links", () => {
    const hits = findRelativeMdLinks("[text][ref]\n\n[ref]: sibling.md");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.href, "sibling.md");
  });

  it("ignores hash-only and non-md relative links", () => {
    assert.equal(findRelativeMdLinks("[section](#intro)").length, 0);
    assert.equal(findRelativeMdLinks("[page](./other.html)").length, 0);
  });

  it("detects .md links with query strings", () => {
    const hits = findRelativeMdLinks("[x](./doc.md?foo=1)");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.href, "./doc.md?foo=1");
  });
});

describe("pageInput", () => {
  it("parses page ids from wiki URLs", () => {
    assert.equal(
      parsePageId(
        "https://example.atlassian.net/wiki/spaces/GCE1/pages/4390912052/Title"
      ),
      "4390912052"
    );
    assert.equal(parsePageId("12345"), "12345");
  });

  it("parses Jira keys", () => {
    assert.equal(parseJiraKey("PROJ-42"), "PROJ-42");
    assert.equal(
      parseJiraKey("https://example.atlassian.net/browse/proj-9"),
      "PROJ-9"
    );
  });

  it("rejects invalid page ids", () => {
    assert.equal(parsePageId(""), null);
    assert.equal(parsePageId("not-a-url"), null);
    assert.equal(parsePageId("https://example.com/wiki/home"), null);
  });
});

describe("local helpers", () => {
  it("prefers an explicit sync file path over confluence registry", () => {
    const cwd = "/tmp/workspace";
    const resolved = resolvePageFilePath("1", cwd, "docs/guide.md");
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

  it("parses page frontmatter", () => {
    const content = `---
id: "99"
title: "Guide"
version: 3
url: https://example.atlassian.net/wiki/spaces/GCE1/pages/99/Guide
syncedHash: abc
---

Body text.
`;
    const page = parsePageMarkdown(
      content,
      "/tmp/workspace/confluence/guide/guide.md",
      "/tmp/workspace"
    );
    assert.ok(page);
    assert.equal(page!.id, "99");
    assert.equal(page!.title, "Guide");
    assert.equal(page!.version, 3);
    assert.equal(page!.body, "Body text.");
  });

  it("returns null without valid frontmatter id", () => {
    assert.equal(
      parsePageMarkdown("---\ntitle: \"x\"\n---\n", "/tmp/x.md", "/tmp"),
      null
    );
  });

  it("builds browse and page URLs", () => {
    assert.equal(
      jiraBrowseUrl("https://example.atlassian.net/", "PROJ-1"),
      "https://example.atlassian.net/browse/PROJ-1"
    );
    assert.equal(
      pageUrl("example.atlassian.net", "", "42", "Title"),
      "https://example.atlassian.net/wiki/pages/viewpage.action?pageId=42"
    );
    assert.match(defaultSiteHost(), /atlassian\.net$/);
    assert.equal(confluenceRootDir("/tmp/ws"), "/tmp/ws/confluence");
  });

  it("lists and resolves local pages on disk", () => {
    withTempDir((cwd) => {
      const content = `---
id: "7"
title: "Root"
version: 1
url: https://example.atlassian.net/wiki/spaces/GCE1/pages/7/Root
syncedHash: deadbeef
---

Root body.
`;
      writePage(cwd, "confluence/root/root.md", content);
      writePage(
        cwd,
        "confluence/root/child/child.md",
        content.replace(/"7"/g, '"8"').replace(/Root/g, "Child")
      );

      const pages = listLocalPages(cwd);
      assert.equal(pages.length, 2);
      const child = pages.find((p) => p.id === "8");
      assert.ok(child);
      assert.equal(localPagePath("8", cwd), child!.path);
      assert.equal(resolvePageFilePath("8", cwd), child!.path);
      assert.equal(localPagePath("missing", cwd), null);
    });
  });
});

describe("formatPageMarkdown", () => {
  it("writes frontmatter with synced hash", () => {
    const md = formatPageMarkdown(
      {
        id: "1",
        title: "Hello",
        version: { number: 2 }
      },
      "Body",
      {
        url: "https://example.atlassian.net/wiki/spaces/GCE1/pages/1/Hello",
        spaceKey: "GCE1"
      }
    );
    assert.match(md, /^---\n/);
    assert.match(md, /id: "1"/);
    assert.match(md, /spaceKey: "GCE1"/);
    assert.match(md, /syncedHash: /);
    assert.match(md, /\nBody\n$/);
  });

  it("extracts space keys from webui paths", () => {
    assert.equal(
      spaceKeyFromWebui("/spaces/GCE1/pages/123/Title"),
      "GCE1"
    );
    assert.equal(spaceKeyFromWebui(undefined), "");
  });

  it("includes parentId when present", () => {
    const md = formatPageMarkdown(
      {
        id: "2",
        title: "Child",
        parentId: "1",
        version: { number: 1 }
      },
      "Child body",
      {
        url: "https://example.atlassian.net/wiki/spaces/GCE1/pages/2/Child",
        spaceKey: "GCE1"
      }
    );
    assert.match(md, /parentId: "1"/);
    assert.match(md, new RegExp(`syncedHash: ${hashBody("Child body")}`));
  });
});

describe("page-state", () => {
  it("detects behind and modified independently", () => {
    const hash = hashBody("body");
    assert.deepEqual(pageChangeState(1, 2, hash, "body"), {
      behind: true,
      modified: false,
      hasBadLinks: false
    });
    assert.deepEqual(pageChangeState(2, 2, hash, "edited"), {
      behind: false,
      modified: true,
      hasBadLinks: false
    });
    assert.deepEqual(pageChangeState(1, 2, hash, "edited"), {
      behind: true,
      modified: true,
      hasBadLinks: false
    });
  });

  it("flags relative links in page state", () => {
    const hash = hashBody("see [x](./y.md)");
    assert.equal(
      pageChangeState(1, 1, hash, "see [x](./y.md)").hasBadLinks,
      true
    );
    assert.equal(classifyPage(1, 1, hash, "see [x](./y.md)"), "links");
  });

  it("classifies clean, behind, and modified pages", () => {
    const hash = hashBody("body");
    assert.equal(classifyPage(1, 1, hash, "body"), "clean");
    assert.equal(classifyPage(1, 2, hash, "body"), "behind");
    assert.equal(classifyPage(2, 2, hash, "edited"), "modified");
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

  it("returns links before other sync decisions", () => {
    const bad = { behind: true, modified: true, hasBadLinks: true };
    assert.equal(decideSync(bad, 0), "links");
  });

  it("treats empty syncedHash as not locally modified", () => {
    assert.deepEqual(pageChangeState(1, 1, "", "edited"), {
      behind: false,
      modified: false,
      hasBadLinks: false
    });
  });
});

describe("markdownToStorage", () => {
  it("converts headings and paragraphs", () => {
    const storage = markdownToStorage(
      "# Title\n\nHello there.",
      "example.atlassian.net"
    );
    assert.match(storage, /<h1>Title<\/h1>/);
    assert.match(storage, /<p>Hello there\.<\/p>/);
  });

  it("converts bullet and ordered lists", () => {
    const storage = markdownToStorage(
      "- Alpha\n- Beta\n\n1. One\n2. Two",
      "example.atlassian.net"
    );
    assert.match(storage, /<ul>.*<li><p>Alpha<\/p><\/li>.*<li><p>Beta<\/p><\/li>.*<\/ul>/s);
    assert.match(storage, /<ol>.*<li><p>One<\/p><\/li>.*<li><p>Two<\/p><\/li>.*<\/ol>/s);
  });

  it("converts inline formatting, links, and code fences", () => {
    const storage = markdownToStorage(
      "**Bold** and `code`\n\n```js\nconst x = 1;\n```\n\n[Jira](https://example.atlassian.net/browse/PROJ-1)",
      "example.atlassian.net"
    );
    assert.match(storage, /<strong>Bold<\/strong>/);
    assert.match(storage, /<code>code<\/code>/);
    assert.match(storage, /ac:structured-macro ac:name="code"/);
    assert.match(storage, /browse\/PROJ-1/);
  });

  it("round-trips a simple heading through storage", () => {
    const source = "## Section\n\nParagraph text.";
    const storage = markdownToStorage(source, "example.atlassian.net");
    const roundTrip = storageToMarkdown(storage, {
      siteHost: "example.atlassian.net"
    });
    assert.match(roundTrip, /## Section/);
    assert.match(roundTrip, /Paragraph text/);
  });
});
