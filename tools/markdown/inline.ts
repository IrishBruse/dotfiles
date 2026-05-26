import { body, bold, inlineCodeStyle, reset } from "./colors.ts";

type InlineSpan = { text: string; style: "body" | "code" | "bold" };

function pushSpan(spans: InlineSpan[], text: string, style: InlineSpan["style"]) {
  if (text.length === 0) return;
  const last = spans.at(-1);
  if (last !== undefined && last.style === style) {
    last.text += text;
    return;
  }
  spans.push({ text, style });
}

/** Parse inline `code`, **bold**, and plain text. */
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
    if (boldAt !== -1) next = Math.min(next, boldAt);
    if (codeAt !== -1) next = Math.min(next, codeAt);

    pushSpan(spans, line.slice(i, next), "body");
    i = next;
  }

  return spans;
}

function renderBold(inner: string): string {
  const parts = parseInline(inner).map((s) => {
    if (s.style === "bold") return renderBold(s.text);
    return `${inlineCodeStyle}${s.text}${reset}`;
  });
  return `${bold}${parts.join("")}${body}`;
}

export function renderInline(line: string): string {
  return parseInline(line)
    .map((span) => {
      if (span.style === "code")
        return `${inlineCodeStyle}${span.text}${reset}${body}`;
      if (span.style === "bold") return renderBold(span.text);
      return span.text;
    })
    .join("");
}
