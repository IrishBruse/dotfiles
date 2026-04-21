/**
 * Confluence storage format (XHTML + ac:/ri: macros) → Markdown for local docs.
 */
import he from "he";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { slugifyConfluenceTitle } from "./confluence-slug.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function linkBodyPlain(html: string): string {
  const f = JSDOM.fragment(html);
  return (f.textContent ?? "").trim();
}

function decodeAttr(s: string): string {
  return he.decode(s.replace(/&amp;/g, "&"));
}

/** Strip Confluence editor noise attributes before HTML→MD. */
function stripEditorAttrs(html: string): string {
  return html
    .replace(/\s+local-id="[^"]*"/g, "")
    .replace(/\s+ac:local-id="[^"]*"/g, "")
    .replace(/\s+ac:macro-id="[^"]*"/g, "")
    .replace(/\s+data-layout="[^"]*"/g, "");
}

function replaceAdfFallbacks(html: string): string {
  return html.replace(
    /<ac:adf-extension>[\s\S]*?<ac:adf-fallback>([\s\S]*?)<\/ac:adf-fallback>[\s\S]*?<\/ac:adf-extension>/gi,
    "$1",
  );
}

function replaceCodeMacros(html: string): string {
  return html.replace(
    /<ac:structured-macro\b[^>]*\bac:name="code"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi,
    (block) => {
      const langM = block.match(
        /<ac:parameter\s+ac:name="language">([^<]*)<\/ac:parameter>/i,
      );
      const lang = (langM?.[1] ?? "").trim();
      const cdataM = block.match(
        /<ac:plain-text-body>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/ac:plain-text-body>/i,
      );
      const body = cdataM?.[1] ?? "";
      const safeLang = lang.replace(/[^a-zA-Z0-9+#.-]/g, "");
      const cls = safeLang ? ` class="language-${safeLang}"` : "";
      return `<pre><code${cls}>${escapeHtml(body)}</code></pre>`;
    },
  );
}

function replaceIframeMacros(html: string): string {
  return html.replace(
    /<ac:structured-macro\b[^>]*\bac:name="iframe"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi,
    (block) => {
      const urlM = block.match(/<ri:url[^>]*\bri:value="([^"]*)"/i);
      if (!urlM) return "";
      const url = decodeAttr(urlM[1]!);
      return `<p><a href="${escapeAttr(url)}">${escapeHtml(url)}</a> (embedded content)</p>`;
    },
  );
}

function replacePageLinks(html: string): string {
  return html.replace(
    /<ac:link\b[^>]*>([\s\S]*?)<\/ac:link>/gi,
    (full, inner: string) => {
      const bodyM = inner.match(/<ac:link-body>([\s\S]*?)<\/ac:link-body>/i);
      const textRaw = bodyM?.[1] ?? "";
      const text = linkBodyPlain(textRaw) || "link";
      const anchorM = full.match(/\bac:anchor="([^"]+)"/i);
      const pageM = inner.match(
        /<ri:page[^>]*\bri:content-title="([^"]*)"/i,
      );
      const urlM = inner.match(/<ri:url[^>]*\bri:value="([^"]*)"/i);
      if (urlM) {
        const url = decodeAttr(urlM[1]!);
        return `<a href="${escapeAttr(url)}">${escapeHtml(text)}</a>`;
      }
      if (pageM) {
        const title = pageM[1]!;
        const path = `${slugifyConfluenceTitle(title)}.md`;
        return `<a href="./${escapeAttr(path)}">${escapeHtml(text)}</a>`;
      }
      if (anchorM) {
        const id = anchorM[1]!;
        return `<a href="#${escapeAttr(id)}">${escapeHtml(text)}</a>`;
      }
      return escapeHtml(text);
    },
  );
}

function replaceImages(html: string): string {
  return html.replace(
    /<ac:image\b[^>]*>[\s\S]*?<\/ac:image>/gi,
    (full) => {
      const altM = full.match(/\bac:alt="([^"]*)"/i);
      const fileM = full.match(
        /<ri:attachment[^>]*\bri:filename="([^"]*)"/i,
      );
      const alt = altM?.[1] ?? fileM?.[1] ?? "image";
      const file = fileM?.[1] ?? "unknown";
      return `<p><img src="attachment:${escapeAttr(file)}" alt="${escapeAttr(alt)}" /></p>`;
    },
  );
}

function unwrapInlineCommentMarkers(html: string): string {
  return html.replace(
    /<ac:inline-comment-marker\b[^>]*>([\s\S]*?)<\/ac:inline-comment-marker>/gi,
    "$1",
  );
}

/** Drop toc/children macros (no portable body). */
function dropNavMacros(html: string): string {
  return html.replace(
    /<ac:structured-macro\b[^>]*\bac:name="(?:toc|children)"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi,
    "",
  );
}

/**
 * Unwrap remaining structured macros: info, note, panels, expand, etc.
 * Prefers rich-text-body; drops empty navigation macros.
 */
function unwrapRemainingStructuredMacros(html: string): string {
  let prev = "";
  let cur = html;
  let guard = 0;
  while (cur !== prev && guard++ < 50) {
    prev = cur;
    cur = cur.replace(
      /<ac:structured-macro\b[^>]*>[\s\S]*?<\/ac:structured-macro>/gi,
      (block) => {
        const rich = block.match(
          /<ac:rich-text-body>([\s\S]*?)<\/ac:rich-text-body>/i,
        );
        if (rich) return `<blockquote>${rich[1]}</blockquote>`;
        const plain = block.match(
          /<ac:plain-text-body>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/ac:plain-text-body>/i,
        );
        if (plain)
          return `<pre><code>${escapeHtml(plain[1]!)}</code></pre>`;
        return "";
      },
    );
  }
  return cur;
}

/** Confluence uses `<td><p>…</p></td>`; Turndown then puts newlines in cells and breaks GFM tables. */
function flattenParagraphsInTableCells(root: Element): void {
  const doc = root.ownerDocument;
  for (const cell of root.querySelectorAll("td, th")) {
    const ps = cell.querySelectorAll(":scope > p");
    if (ps.length === 0) continue;
    if (ps.length === 1) {
      const p = ps[0]!;
      while (p.firstChild) cell.insertBefore(p.firstChild, p);
      p.remove();
      continue;
    }
    const list = Array.from(ps);
    let first = true;
    for (const p of list) {
      if (!first && doc) cell.insertBefore(doc.createTextNode(" "), p);
      first = false;
      while (p.firstChild) cell.insertBefore(p.firstChild, p);
      p.remove();
    }
  }
}

/** Collapse whitespace/newlines in a table cell's markdown (GFM tables must be single-line per row). */
function collapseCellMarkdown(s: string): string {
  const parts = s.split("```");
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim(),
    )
    .join("```")
    .trim();
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
  });
  td.use(gfm);
  td.addRule("tableCellCollapse", {
    filter: ["th", "td"],
    replacement(content, node) {
      const collapsed = collapseCellMarkdown(content);
      const parent = node.parentNode;
      if (!parent) return collapsed;
      const index = Array.prototype.indexOf.call(parent.childNodes, node);
      const prefix = index === 0 ? "| " : " ";
      return prefix + collapsed + " |";
    },
  });
  td.addRule("attachmentImage", {
    filter(node) {
      return (
        node.nodeName === "IMG" &&
        Boolean(node.getAttribute("src")?.startsWith("attachment:"))
      );
    },
    replacement(_content, node) {
      const src = node.getAttribute("src") ?? "";
      const file = src.replace(/^attachment:/, "");
      const alt = node.getAttribute("alt") ?? file;
      return `![${alt}](${src})`;
    },
  });
  return td;
}

const turndown = buildTurndown();

export function storageToMarkdown(storage: string): string {
  let html = storage.trim();
  if (!html) return "";

  html = replaceAdfFallbacks(html);
  html = dropNavMacros(html);
  html = replaceCodeMacros(html);
  html = replaceIframeMacros(html);
  html = replacePageLinks(html);
  html = replaceImages(html);
  html = unwrapInlineCommentMarkers(html);
  html = unwrapRemainingStructuredMacros(html);
  html = stripEditorAttrs(html);

  const fragment = JSDOM.fragment(`<div id="root">${html}</div>`);
  const root = fragment.firstChild;
  if (!root || root.nodeType !== 1) return he.decode(storage).trim();

  flattenParagraphsInTableCells(root as Element);

  const out = turndown.turndown(root as unknown as HTMLElement).trim();

  return out
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");
}
