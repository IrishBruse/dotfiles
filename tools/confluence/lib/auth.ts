import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import process from "node:process";

import { CONFIG } from "./CONFIG.ts";

type TokenBlob = {
  access_token: string;
  token_type?: string;
  refresh_token?: string;
  expiry?: string;
};

/** Refresh acli OAuth state before reading credentials from the OS store. */
export function ensureConfluenceAuth(acli = "acli"): void {
  try {
    execFileSync(acli, ["confluence", "auth", "status"], {
      encoding: "utf-8",
      stdio: ["ignore", "ignore", "pipe"]
    });
  } catch {
    throw new Error(
      "Confluence is not authenticated. Run: acli confluence auth login"
    );
  }
}

function decodeKeychainSecret(raw: string): string {
  let payload = raw.trim();
  if (payload.startsWith("go-keyring-base64:")) {
    let buf = Buffer.from(payload.slice("go-keyring-base64:".length), "base64");
    if (buf[0] === 0x1f && buf[1] === 0x8b) {
      buf = gunzipSync(buf);
    }
    payload = buf.toString("utf-8");
  }
  return payload;
}

function readDarwinAcliToken(): TokenBlob {
  let raw: string;
  try {
    raw = execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-s", "acli", "-w"],
      { encoding: "utf-8" }
    );
  } catch {
    throw new Error(
      "Could not read acli OAuth token from the macOS keychain. Run: acli confluence auth login"
    );
  }
  try {
    return JSON.parse(decodeKeychainSecret(raw)) as TokenBlob;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not parse acli keychain token (${hint})`);
  }
}

function readLinuxAcliToken(): TokenBlob {
  let raw: string;
  try {
    raw = execFileSync("secret-tool", ["lookup", "service", "acli"], {
      encoding: "utf-8"
    });
  } catch {
    throw new Error(
      "Could not read acli OAuth token from the Linux secret service. Run: acli confluence auth login"
    );
  }
  try {
    return JSON.parse(decodeKeychainSecret(raw)) as TokenBlob;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not parse acli secret token (${hint})`);
  }
}

/** OAuth access token used for Confluence REST writes. */
export function readAcliAccessToken(): string {
  ensureConfluenceAuth();
  const blob =
    process.platform === "darwin"
      ? readDarwinAcliToken()
      : readLinuxAcliToken();
  if (!blob.access_token) {
    throw new Error("acli token blob is missing access_token");
  }
  return blob.access_token;
}

/** Site host and cloud id for Confluence REST calls. */
export function confluenceApiContext(): {
  site: string;
  cloudId: string;
} {
  return {
    site: CONFIG.site.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    cloudId: CONFIG.cloudId
  };
}
