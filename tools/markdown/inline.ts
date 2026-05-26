import { body, bold, inlineCodeStyle, italic, reset } from "./colors.ts";
import type { LinkRefs } from "./types.ts";
import { terminalLink } from "./links.ts";

type InlineSpan = {
  text: string;
  style: "body" | "code" | "bold" | "italic" | "link";
  url?: string;
};

function pushSpan(spans: InlineSpan[], text: string, style: InlineSpan["style"], url?: string) {
  if (text.length === 0) return;
  const last = spans.at(-1);
  if (last !== undefined && last.style === style && last.url === url) {
    last.text += text;
    return;
  }
  spans.push({ text, style, url });
}

function parseParenDestination(
  line: string,
  start: number
): { url: string; end: number } | null {
  if (line[start] !== "(") return null;
  let j = start + 1;
  if (line[j] === "<") {
    const gt = line.indexOf(">", j + 1);
    if (gt === -1) return null;
    return { url: line.slice(j + 1, gt), end: gt + 1 };
  }
  let end = j;
  let inQuote = false;
  while (end < line.length) {
    const ch = line[end];
    if (ch === '"') {
      inQuote = !inQuote;
      end++;
      continue;
    }
    if (ch === ")" && !inQuote) {
      const inner = line.slice(j, end).trim();
      const url = (/^(\S+)/.exec(inner))?.[1] ?? inner;
      return { url, end: end + 1 };
    }
    end++;
  }
  return null;
}

function tryParseLink(
  line: string,
  i: number,
  refs: LinkRefs
): { consumed: number; text: string; url: string } | null {
  if (line[i] !== "[") return null;
  const textEnd = line.indexOf("]", i + 1);
  if (textEnd === -1) return null;
  const text = line.slice(i + 1, textEnd);
  const after = textEnd + 1;

  if (line[after] === "(") {
    const dest = parseParenDestination(line, after);
    if (dest === null) return null;
    return { consumed: dest.end - i, text, url: dest.url };
  }

  if (line[after] === "[") {
    const refEnd = line.indexOf("]", after + 1);
    if (refEnd === -1) return null;
    let refKey = line.slice(after + 1, refEnd);
    if (refKey === "") refKey = text;
    const url = refs.get(refKey.toLowerCase());
    if (url === undefined) return null;
    return { consumed: refEnd - i + 1, text, url };
  }

  const url = refs.get(text.toLowerCase());
  if (url === undefined) return null;
  return { consumed: textEnd - i + 1, text, url };
}

function backtickRunLength(line: string, start: number): number {
  let n = 0;
  while (start + n < line.length && line[start + n] === "`") n++;
  return n;
}

/** CommonMark code span: matching backtick runs, trim edge spaces when padded. */
function tryParseCodeSpan(
  line: string,
  i: number
): { content: string; end: number } | null {
  const openLen = backtickRunLength(line, i);
  if (openLen === 0) return null;

  const contentStart = i + openLen;
  let k = contentStart;
  while (k < line.length) {
    if (line[k] !== "`") {
      k++;
      continue;
    }
    const closeLen = backtickRunLength(line, k);
    if (closeLen < openLen) {
      k += closeLen;
      continue;
    }
    let content = line.slice(contentStart, k);
    if (
      content.length >= 2 &&
      content.startsWith(" ") &&
      content.endsWith(" ") &&
      content.trim().length > 0
    ) {
      content = content.slice(1, -1);
    }
    return { content, end: k + openLen };
  }
  return null;
}

/** Parse inline links, `code`, **bold**, *italic*, and plain text. */
export function parseInline(line: string, refs: LinkRefs = new Map()): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let i = 0;

  while (i < line.length) {
    if (line.startsWith("**", i)) {
      const end = line.indexOf("**", i + 2);
      if (end !== -1) {
        pushSpan(spans, line.slice(i + 2, end), "bold");
        i = end + 2;
        continue;
      }
    }

    const link = tryParseLink(line, i, refs);
    if (link !== null) {
      pushSpan(spans, link.text, "link", link.url);
      i += link.consumed;
      continue;
    }
    if (line[i] === "[") {
      pushSpan(spans, "[", "body");
      i++;
      continue;
    }

    if (
      (line[i] === "*" || line[i] === "_") &&
      line[i + 1] !== line[i]
    ) {
      const mark = line[i];
      const end = line.indexOf(mark, i + 1);
      if (end !== -1 && line[end + 1] !== mark) {
        pushSpan(spans, line.slice(i + 1, end), "italic");
        i = end + 1;
        continue;
      }
    }

    const codeSpan = tryParseCodeSpan(line, i);
    if (codeSpan !== null) {
      pushSpan(spans, codeSpan.content, "code");
      i = codeSpan.end;
      continue;
    }

    let next = line.length;
    const boldAt = line.indexOf("**", i);
    const linkAt = line.indexOf("[", i);
    const codeAt = line.indexOf("`", i);
    const starAt = line.indexOf("*", i);
    const underAt = line.indexOf("_", i);
    if (boldAt !== -1) next = Math.min(next, boldAt);
    if (linkAt !== -1) next = Math.min(next, linkAt);
    if (codeAt !== -1) next = Math.min(next, codeAt);
    if (starAt !== -1 && !line.startsWith("**", starAt)) {
      next = Math.min(next, starAt);
    }
    if (underAt !== -1 && !line.startsWith("__", underAt)) {
      next = Math.min(next, underAt);
    }

    pushSpan(spans, line.slice(i, next), "body");
    i = next > i ? next : i + 1;
  }

  return spans;
}

/** Visible character count after inline markdown is rendered (no ANSI). */
export function plainInlineLength(line: string, refs: LinkRefs = new Map()): number {
  return parseInline(line, refs).reduce((n, span) => n + span.text.length, 0);
}

function renderSpan(span: InlineSpan, restoreFg: string, refs: LinkRefs): string {
  if (span.style === "code")
    return `${inlineCodeStyle}${span.text}${reset}${restoreFg}`;
  if (span.style === "bold") return renderBold(span.text, restoreFg, refs);
  if (span.style === "italic") return renderItalic(span.text, restoreFg, refs);
  if (span.style === "link" && span.url !== undefined)
    return terminalLink(span.url, span.text, restoreFg);
  return span.text;
}

function renderBold(inner: string, restoreFg: string, refs: LinkRefs): string {
  const parts = parseInline(inner, refs).map((s) => {
    if (s.style === "bold") return renderBold(s.text, restoreFg, refs);
    if (s.style === "code")
      return `${inlineCodeStyle}${s.text}${reset}${restoreFg}`;
    if (s.style === "italic") return renderItalic(s.text, restoreFg, refs);
    if (s.style === "link" && s.url !== undefined)
      return terminalLink(s.url, s.text, restoreFg);
    return s.text;
  });
  return `${bold}${restoreFg}${parts.join("")}${reset}${restoreFg}`;
}

function renderItalic(inner: string, restoreFg: string, refs: LinkRefs): string {
  const parts = parseInline(inner, refs).map((s) => {
    if (s.style === "italic") return renderItalic(s.text, restoreFg, refs);
    if (s.style === "bold") return renderBold(s.text, restoreFg, refs);
    if (s.style === "code")
      return `${inlineCodeStyle}${s.text}${reset}${restoreFg}`;
    if (s.style === "link" && s.url !== undefined)
      return terminalLink(s.url, s.text, restoreFg);
    return s.text;
  });
  return `${italic}${restoreFg}${parts.join("")}${reset}${restoreFg}`;
}

/** @param restoreFg foreground to resume after inline styles (default: body) */
export function renderInline(
  line: string,
  restoreFg: string = body,
  refs: LinkRefs = new Map()
): string {
  return parseInline(line, refs)
    .map((span) => renderSpan(span, restoreFg, refs))
    .join("");
}
