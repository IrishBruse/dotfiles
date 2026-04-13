/**
 * Normalize Confluence / ISO-like timestamps to DD-MM-YYYY HH:MM:SS (local time).
 */

const CONFLUENCE_DATE_TAG =
  /<custom data-type="date"[^>]*>([^<]*)<\/custom>/g;

export function formatConfluenceDateForOutput(input: unknown): string {
  if (input == null) return "";
  let d: Date;
  if (typeof input === "number" && Number.isFinite(input)) {
    d = new Date(input);
  } else {
    const s = String(input).trim();
    if (!s) return "";
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) {
    return typeof input === "string" ? input.trim() : String(input);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${sec}`;
}

export function replaceConfluenceDateNodes(text: string): string {
  return text.replace(CONFLUENCE_DATE_TAG, (_full, inner: string) =>
    formatConfluenceDateForOutput(inner),
  );
}

const DATE_FIELD_KEYS = new Set([
  "createdAt",
  "lastModified",
  "publishedAt",
  "updatedAt",
]);

const MARKUP_FIELD_KEYS = new Set([
  "body",
  "content",
  "description",
  "excerpt",
]);

function transformConfluenceJsonValue(key: string | null, val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    if (key && DATE_FIELD_KEYS.has(key)) {
      return formatConfluenceDateForOutput(val);
    }
    if (key && MARKUP_FIELD_KEYS.has(key)) {
      return replaceConfluenceDateNodes(val);
    }
    if (/<custom data-type="date"/.test(val)) {
      return replaceConfluenceDateNodes(val);
    }
    return val;
  }
  if (typeof val === "number" && key && DATE_FIELD_KEYS.has(key)) {
    return formatConfluenceDateForOutput(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => transformConfluenceJsonValue(null, item));
  }
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = transformConfluenceJsonValue(k, v);
    }
    return out;
  }
  return val;
}

export function shouldNormalizeConfluenceToolOutput(toolName: string): boolean {
  return (
    toolName === "getConfluencePage" ||
    toolName === "getPagesInConfluenceSpace" ||
    toolName === "searchConfluenceUsingCql"
  );
}

export function normalizeConfluenceToolJson(
  toolName: string,
  data: unknown,
): unknown {
  if (!shouldNormalizeConfluenceToolOutput(toolName)) return data;
  return transformConfluenceJsonValue(null, data);
}
