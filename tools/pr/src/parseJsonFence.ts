export type PrReviewJson = {
  title: string;
  body: string;
  pr?: string;
};

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/g;

/** Raw text of the last ```json``` fence in the agent result (unparsed). */
export function getLastJsonFenceRaw(text: string): string {
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((m = JSON_FENCE_RE.exec(text)) !== null) {
    last = m;
  }
  if (last === null) {
    throw new Error("no ```json``` fence in agent output");
  }
  return last[1]!.trim();
}

/** Parse the JSON from a string (what was inside the ```json``` block). */
export function parsePrReviewFromJsonString(raw: string): PrReviewJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("JSON inside ```json``` fence is invalid");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("JSON in fence must be an object");
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.title !== "string" || typeof o.body !== "string") {
    throw new Error("JSON must have string fields title and body");
  }
  const out: PrReviewJson = { title: o.title, body: o.body };
  if (o.pr !== undefined) {
    if (typeof o.pr !== "string") {
      throw new Error("if present, pr must be a string");
    }
    out.pr = o.pr;
  }
  return out;
}

/**
 * Find the last markdown ```json``` fence in the full agent result, parse to title/body.
 */
export function parseLastJsonFence(text: string): PrReviewJson {
  return parsePrReviewFromJsonString(getLastJsonFenceRaw(text));
}
