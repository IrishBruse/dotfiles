/** Matches markdownInlineEditor.colors in VS Code settings. */

export const theme = {
  body: "#ABB2BF",
  border: "#3E4451",
  inlineCode: "#C678DD",
  inlineCodeBackground: "#23282f",
  heading1: "#D19A66",
  heading2: "#E06C75",
  heading3: "#61AFEF",
  heading4: "#C678DD",
  heading5: "#C678DD",
  heading6: "#C678DD"
} as const;

const headingHex = [
  theme.heading1,
  theme.heading2,
  theme.heading3,
  theme.heading4,
  theme.heading5,
  theme.heading6
] as const;

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function fg(hex: string): string {
  const [r, g, b] = rgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function bg(hex: string): string {
  const [r, g, b] = rgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
}

export function headingFg(level: number): string {
  const hex = headingHex[Math.min(Math.max(level, 1), 6) - 1];
  return fg(hex);
}

export const reset = "\x1b[0m";
export const bold = "\x1b[1m";

export const body = fg(theme.body);
export const border = fg(theme.border);
export const inlineCode = fg(theme.inlineCode);
export const inlineCodeStyle = `${inlineCode}${bg(theme.inlineCodeBackground)}`;
export const codeBlockStyle = `${body}${bg(theme.inlineCodeBackground)}`;
