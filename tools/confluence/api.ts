import { runAcliJson, runAcliJsonAsync } from "./acli.ts";
import { confluenceApiContext, readAcliAccessToken } from "./auth.ts";
import type { PageViewJson } from "./types.ts";

function apiFailureMessage(status: number, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return `HTTP ${status}`;
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}...` : trimmed;
}

/** Fetch one page via `acli confluence page view`. */
export function fetchPageAcli(pageId: string, acli = "acli"): PageViewJson {
  const data = runAcliJson([
    "confluence",
    "page",
    "view",
    "--id",
    pageId,
    "--json",
    "--include-direct-children",
    "--body-format",
    "storage"
  ], acli);
  if (!data || typeof data !== "object") {
    throw new Error(`no data returned for page ${pageId}`);
  }
  return data as PageViewJson;
}

/** Async variant of {@link fetchPageAcli}. */
export async function fetchPageAcliAsync(
  pageId: string,
  acli = "acli"
): Promise<PageViewJson> {
  const data = await runAcliJsonAsync([
    "confluence",
    "page",
    "view",
    "--id",
    pageId,
    "--json",
    "--include-direct-children",
    "--body-format",
    "storage"
  ], acli);
  if (!data || typeof data !== "object") {
    throw new Error(`no data returned for page ${pageId}`);
  }
  return data as PageViewJson;
}

/** Remote version and last-updated time for sync decisions. */
export type PageSyncMeta = {
  version: number;
  updatedAt?: string;
};

function readPageSyncMeta(data: unknown): PageSyncMeta {
  const page = data as PageViewJson | null;
  return {
    version: page?.version?.number ?? 0,
    updatedAt: page?.version?.createdAt
  };
}

/** Fetch remote page version only (no body). */
export async function fetchPageVersion(
  pageId: string,
  acli = "acli"
): Promise<number> {
  const data = await runAcliJsonAsync([
    "confluence",
    "page",
    "view",
    "--id",
    pageId,
    "--json"
  ], acli);
  return readPageSyncMeta(data).version;
}

/** Fetch remote page version and last-updated timestamp (no body). */
export async function fetchPageSyncMeta(
  pageId: string,
  acli = "acli"
): Promise<PageSyncMeta> {
  const data = await runAcliJsonAsync([
    "confluence",
    "page",
    "view",
    "--id",
    pageId,
    "--json"
  ], acli);
  return readPageSyncMeta(data);
}

export type UpdatePageInput = {
  id: string;
  title: string;
  version: number;
  storageBody: string;
};

/** Push page body to Confluence via REST API v2. */
export async function updatePageStorage(
  input: UpdatePageInput
): Promise<PageViewJson> {
  const token = readAcliAccessToken();
  const { cloudId } = confluenceApiContext();
  const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/api/v2/pages/${input.id}`;
  const payload = {
    id: input.id,
    status: "current",
    title: input.title,
    body: {
      representation: "storage",
      value: input.storageBody
    },
    version: {
      number: input.version + 1,
      message: "Updated via confluence CLI"
    }
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Confluence update failed (${res.status}): ${apiFailureMessage(res.status, text)}`
    );
  }

  try {
    return JSON.parse(text) as PageViewJson;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Expected JSON from Confluence update (${hint})`);
  }
}
