/** Matches markdownInlineEditor.colors in VS Code settings. */

/** markdownInlineEditor.decorations.ghostFaintOpacity */
export const ghostFaintOpacity = 0.5;

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

function blend(fgHex: string, bgHex: string, alpha: number): string {
  const [fr, fg, fb] = rgb(fgHex);
  const [br, bg, bb] = rgb(bgHex);
  const r = Math.round(fr * alpha + br * (1 - alpha));
  const g = Math.round(fg * alpha + bg * (1 - alpha));
  const b = Math.round(fb * alpha + bb * (1 - alpha));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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
export const italic = "\x1b[3m";

export const body = fg(theme.body);
export const border = fg(theme.border);
export const inlineCode = fg(theme.inlineCode);
export const inlineCodeStyle = `${inlineCode}${bg(theme.inlineCodeBackground)}`;
export const codeBlockStyle = `${body}${bg(theme.inlineCodeBackground)}`;
export const italicStyle = `${italic}${body}`;
const codeBlockGhostFg = fg(
  blend(theme.body, theme.inlineCodeBackground, ghostFaintOpacity)
);
export const codeBlockGhostStyle = `${italic}${codeBlockGhostFg}${bg(theme.inlineCodeBackground)}`;
