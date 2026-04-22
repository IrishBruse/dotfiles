export type PrReviewJson = {
  title: string;
  body: string;
  pr?: string;
};

/**
 * Find the last markdown ```json``` fence, parse it, expect string title and body.
 */
export function parseLastJsonFence(text: string): PrReviewJson {
  const re = /```json\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((m = re.exec(text)) !== null) {
    last = m;
  }
  if (last === null) {
    throw new Error("no ```json``` fence in agent output");
  }
  const raw = last[1]!.trim();
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
