import { body, bold, inlineCodeStyle, italicStyle, reset } from "./colors.ts";

type InlineSpan = { text: string; style: "body" | "code" | "bold" | "italic" };

function pushSpan(spans: InlineSpan[], text: string, style: InlineSpan["style"]) {
  if (text.length === 0) return;
  const last = spans.at(-1);
  if (last !== undefined && last.style === style) {
    last.text += text;
    return;
  }
  spans.push({ text, style });
}

/** Parse inline `code`, **bold**, *italic*, and plain text. */
export function parseInline(line: string): InlineSpan[] {
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

    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      if (end !== -1) {
        pushSpan(spans, line.slice(i + 1, end), "code");
        i = end + 1;
        continue;
      }
    }

    let next = line.length;
    const boldAt = line.indexOf("**", i);
    const codeAt = line.indexOf("`", i);
    const starAt = line.indexOf("*", i);
    const underAt = line.indexOf("_", i);
    if (boldAt !== -1) next = Math.min(next, boldAt);
    if (codeAt !== -1) next = Math.min(next, codeAt);
    if (starAt !== -1 && !line.startsWith("**", starAt)) {
      next = Math.min(next, starAt);
    }
    if (underAt !== -1 && !line.startsWith("__", underAt)) {
      next = Math.min(next, underAt);
    }

    pushSpan(spans, line.slice(i, next), "body");
    i = next;
  }

  return spans;
}

/** Visible character count after inline markdown is rendered (no ANSI). */
export function plainInlineLength(line: string): number {
  return parseInline(line).reduce((n, span) => n + span.text.length, 0);
}

function renderBold(inner: string, restoreFg: string): string {
  const parts = parseInline(inner).map((s) => {
    if (s.style === "bold") return renderBold(s.text, restoreFg);
    if (s.style === "code")
      return `${inlineCodeStyle}${s.text}${reset}${restoreFg}`;
    if (s.style === "italic")
      return `${italicStyle}${s.text}${reset}${restoreFg}`;
    return s.text;
  });
  return `${bold}${parts.join("")}${restoreFg}`;
}

function renderItalic(inner: string, restoreFg: string): string {
  return `${italicStyle}${renderInline(inner, restoreFg)}${reset}${restoreFg}`;
}

/** @param restoreFg foreground to resume after inline styles (default: body) */
export function renderInline(line: string, restoreFg: string = body): string {
  return parseInline(line)
    .map((span) => {
      if (span.style === "code")
        return `${inlineCodeStyle}${span.text}${reset}${restoreFg}`;
      if (span.style === "bold") return renderBold(span.text, restoreFg);
      if (span.style === "italic") return renderItalic(span.text, restoreFg);
      return span.text;
    })
    .join("");
}
