import { MAX_LINE } from "../core/shared.ts";
import { isCodeFenceLine } from "../core/fix-shared.ts";

type LineToken =
  | { kind: "prose"; text: string }
  | { kind: "code"; text: string };

/** Plain prose or list body text worth auto-wrapping. */
export function isWrappableLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (trimmed === "") return false;
  if (/^#{1,6}\s/.test(trimmed)) return false;
  if (/^>\s?/.test(trimmed)) return false;
  if (/^\|/.test(trimmed)) return false;
  if (/^```/.test(trimmed)) return false;
  if (/^<[/!?a-zA-Z]/.test(trimmed)) return false;
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return false;
  return true;
}

/** @deprecated Use isWrappableLine. */
export function isSimpleProseLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (!isWrappableLine(line)) return false;
  if (/^[-*+]\s/.test(trimmed)) return false;
  if (/^\d+\.\s/.test(trimmed)) return false;
  return true;
}

function tokenizeInlineCode(line: string): LineToken[] {
  const tokens: LineToken[] = [];
  const pattern = /(`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "prose", text: line.slice(lastIndex, match.index) });
    }
    tokens.push({ kind: "code", text: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push({ kind: "prose", text: line.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ kind: "prose", text: line }];
}

function splitProseAtSpace(prose: string, maxLength: number): [string, string] | null {
  if (prose.length <= maxLength) return [prose, ""];
  const window = prose.slice(0, maxLength + 1);
  const spaceAt = window.lastIndexOf(" ");
  if (spaceAt <= 0) return null;
  return [prose.slice(0, spaceAt), prose.slice(spaceAt + 1)];
}

function wrapTokens(
  tokens: LineToken[],
  options?: { firstLinePrefix?: string; continuationLinePrefix?: string }
): string[] {
  const firstLinePrefix = options?.firstLinePrefix ?? "";
  const continuationLinePrefix = options?.continuationLinePrefix ?? "";

  const lines: string[] = [firstLinePrefix];

  function currentLine(): string {
    return lines[lines.length - 1] ?? "";
  }

  function setCurrentLine(value: string): void {
    lines[lines.length - 1] = value;
  }

  function activePrefixLength(): number {
    return lines.length === 1
      ? firstLinePrefix.length
      : continuationLinePrefix.length;
  }

  function startNewLine(): void {
    lines.push(continuationLinePrefix);
  }

  function remainingRoom(): number {
    return MAX_LINE - currentLine().length;
  }

  for (const token of tokens) {
    if (token.kind === "code") {
      if (currentLine().length > 0 && currentLine().length + token.text.length > MAX_LINE) {
        startNewLine();
      }
      setCurrentLine(currentLine() + token.text);
      continue;
    }

    let prose = token.text;
    while (prose.length > 0) {
      const room = remainingRoom();
      if (prose.length <= room) {
        setCurrentLine(currentLine() + prose);
        prose = "";
        continue;
      }

      if (room <= 0) {
        startNewLine();
        continue;
      }

      const split = splitProseAtSpace(prose, room);
      if (!split) {
        if (currentLine().length > activePrefixLength()) {
          startNewLine();
          continue;
        }
        setCurrentLine(currentLine() + prose);
        prose = "";
        break;
      }

      const [head, tail] = split;
      if (head.trim() === "" || tail.trim() === "") {
        if (currentLine().length > activePrefixLength()) {
          startNewLine();
          continue;
        }
        setCurrentLine(currentLine() + prose);
        prose = "";
        break;
      }

      setCurrentLine(currentLine() + head);
      prose = tail;
      startNewLine();
    }
  }

  return lines;
}

export function wrapLinePreservingInlineCode(
  line: string,
  options?: { firstLinePrefix?: string; continuationLinePrefix?: string }
): string {
  const firstLinePrefix = options?.firstLinePrefix ?? "";
  const continuationLinePrefix = options?.continuationLinePrefix ?? "";
  if (firstLinePrefix.length + line.length <= MAX_LINE) {
    return firstLinePrefix + line;
  }

  const wrapped = wrapTokens(tokenizeInlineCode(line), {
    firstLinePrefix,
    continuationLinePrefix,
  }).join("\n");
  return wrapped.includes("\n") ? wrapped : firstLinePrefix + line;
}

/** @deprecated Use wrapLinePreservingInlineCode. */
export function wrapProse(line: string): string {
  return wrapLinePreservingInlineCode(line);
}

function parseListPrefix(line: string): { prefix: string; body: string } | null {
  const unordered = /^(\s*[-*+]\s)(.*)$/.exec(line);
  if (unordered) {
    return { prefix: unordered[1], body: unordered[2] ?? "" };
  }

  const ordered = /^(\s*\d+\.\s)(.*)$/.exec(line);
  if (ordered) {
    return { prefix: ordered[1], body: ordered[2] ?? "" };
  }

  return null;
}

function wrapLine(line: string): string {
  const list = parseListPrefix(line);
  if (!list) {
    return wrapLinePreservingInlineCode(line);
  }

  if (list.prefix.length + list.body.length <= MAX_LINE) {
    return line;
  }

  return wrapLinePreservingInlineCode(list.body, {
    firstLinePrefix: list.prefix,
    continuationLinePrefix: " ".repeat(list.prefix.length),
  });
}

function shouldSkipLongLine(line: string): boolean {
  return (
    line.length <= MAX_LINE ||
    line.includes("://") ||
    /^\s*\|/.test(line) ||
    !isWrappableLine(line)
  );
}

function fixLongLine(line: string): string {
  if (shouldSkipLongLine(line)) {
    return line;
  }
  return wrapLine(line);
}

export function canAutoFixLongLine(line: string): boolean {
  if (shouldSkipLongLine(line)) {
    return false;
  }
  const fixed = fixLongLine(line);
  if (fixed === line) {
    return false;
  }
  return fixed.split("\n").every((part) => part.length <= MAX_LINE);
}

function fixLongLinesOnce(content: string): string {
  const lines = content.split("\n");
  let inCodeBlock = false;
  const out: string[] = [];

  for (const rawLine of lines) {
    if (isCodeFenceLine(rawLine)) {
      inCodeBlock = !inCodeBlock;
      out.push(rawLine);
      continue;
    }
    if (inCodeBlock) {
      out.push(rawLine);
      continue;
    }
    out.push(...fixLongLine(rawLine).split("\n"));
  }

  return out.join("\n");
}

/** @skills/long-line */
export function fix(content: string): string {
  let result = content;
  for (let pass = 0; pass < 20; pass++) {
    const next = fixLongLinesOnce(result);
    if (next === result) {
      break;
    }
    result = next;
  }
  return result;
}
