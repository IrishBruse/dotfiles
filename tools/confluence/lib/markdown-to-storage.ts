import { CONFIG } from "./CONFIG.ts";
import { jiraBrowseUrl } from "./local.ts";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function inlineMarkdown(text: string, siteHost: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_full, label: string, href: string) => {
    const url = href.trim();
    const keyMatch = url.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i);
    if (keyMatch) {
      const key = keyMatch[1]!.toUpperCase();
      const browse = jiraBrowseUrl(siteHost, key);
      return `<a href="${escapeAttr(browse)}">${escapeHtml(label)}</a>`;
    }
    return `<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`;
  });
  return out;
}

function blockMarkdownToStorage(block: string, siteHost: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const fence = /^```([a-zA-Z0-9+#.-]*)\n([\s\S]*?)```$/m.exec(trimmed);
  if (fence) {
    const lang = fence[1] ?? "";
    const body = fence[2] ?? "";
    const safeLang = lang.replace(/[^a-zA-Z0-9+#.-]/g, "");
    const langParam = safeLang
      ? `<ac:parameter ac:name="language">${escapeHtml(safeLang)}</ac:parameter>`
      : "";
    return `<ac:structured-macro ac:name="code">${langParam}<ac:plain-text-body><![CDATA[${body.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]></ac:plain-text-body></ac:structured-macro>`;
  }

  const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
  if (heading) {
    const level = heading[1]!.length;
    return `<h${level}>${inlineMarkdown(heading[2]!, siteHost)}</h${level}>`;
  }

  const lines = trimmed.split("\n");
  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^[-*]\s+/, ""))
      .map((line) => `<li><p>${inlineMarkdown(line, siteHost)}</p></li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((line) => `<li><p>${inlineMarkdown(line, siteHost)}</p></li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((part) => `<p>${inlineMarkdown(part.replace(/\n/g, " "), siteHost)}</p>`)
    .join("");
}

/** Convert local markdown body to Confluence storage HTML for push. */
export function markdownToStorage(
  markdown: string,
  siteHost?: string
): string {
  const host = (siteHost ?? CONFIG.site)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const parts: string[] = [];
  for (const block of blocks) {
    const storage = blockMarkdownToStorage(block, host);
    if (storage) parts.push(storage);
  }
  return parts.join("");
}
