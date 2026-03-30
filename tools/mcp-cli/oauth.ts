/**
 * OAuth 2.0 + PKCE utilities for MCP HTTP servers.
 * Supports dynamic client registration, auth code flow, and token refresh.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { exec } from "node:child_process";

export const TOKENS_PATH = path.join(
  os.homedir(),
  ".config",
  "mcp-cli",
  "tokens.json",
); // TODO: Improve where this is stored

// --- Types ---

export interface StoredToken {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  client_id?: string;
  client_secret?: string;
  token_endpoint?: string;
}

interface OAuthMeta {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface ClientRegistration {
  client_id: string;
  client_secret?: string;
}

interface ExchangeCodeOpts {
  tokenEndpoint: string;
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
}

interface RefreshTokenOpts {
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}

// --- Token storage ---

export function loadTokens(): Record<string, StoredToken> {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveTokens(tokens: Record<string, StoredToken>): void {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

// --- PKCE ---

export function pkceVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// --- Discovery & registration ---

export async function discoverOAuth(serverUrl: string): Promise<OAuthMeta> {
  const { protocol, host } = new URL(serverUrl);
  const res = await fetch(
    `${protocol}//${host}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok)
    throw new Error(`OAuth discovery failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<OAuthMeta>;
}

export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
): Promise<ClientRegistration> {
  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "mcp-cli",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  if (!res.ok)
    throw new Error(
      `Client registration failed: ${res.status} ${await res.text()}`,
    );
  return res.json() as Promise<ClientRegistration>;
}

// --- Callback server ---

/**
 * Starts a local HTTP server on a random port, returns the port and a promise
 * that resolves with the auth code when the browser redirects back.
 */
export function startCallbackServer(): Promise<{
  port: number;
  codePromise: Promise<string>;
}> {
  return new Promise((resolveServer) => {
    let resolveCode!: (code: string) => void;
    let rejectCode!: (err: Error) => void;
    const codePromise = new Promise<string>((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    let settled = false;

    const server = http.createServer((req, res) => {
      if (settled) return;
      const u = new URL(req.url ?? "/", "http://localhost");
      const code = u.searchParams.get("code");
      const error = u.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        code
          ? "<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>"
          : `<h1>Authorization failed</h1><p>${error ?? "unknown error"}</p>`,
      );
      settled = true;
      server.close();
      if (code) resolveCode(code);
      else rejectCode(new Error(`OAuth error: ${error ?? "unknown"}`));
    });

    server.listen(0, "localhost", () => {
      const { port } = server.address() as AddressInfo;
      resolveServer({ port, codePromise });
    });

    server.on("error", (e) => rejectCode(e));
  });
}

export function openBrowser(url: string): void {
  exec(`open ${JSON.stringify(url)}`);
}

// --- Token exchange & refresh ---

export async function exchangeCode(
  opts: ExchangeCodeOpts,
): Promise<TokenResponse> {
  const {
    tokenEndpoint,
    code,
    clientId,
    clientSecret,
    redirectUri,
    codeVerifier,
  } = opts;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  if (clientSecret) body.set("client_secret", clientSecret);
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok)
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  opts: RefreshTokenOpts,
): Promise<TokenResponse> {
  const { tokenEndpoint, refreshToken, clientId, clientSecret } = opts;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  if (clientSecret) body.set("client_secret", clientSecret);
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok)
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

// --- High-level token getter ---

/**
 * Gets a valid access token, running the full OAuth flow if needed.
 * @param log Callback for status messages (typically writes to stderr).
 */
export async function getOAuthToken(
  serverConfig: { url: string },
  serverName: string,
  log: (msg: string) => void,
  opts: { forceRefresh?: boolean } = {},
): Promise<string> {
  const { forceRefresh = false } = opts;
  const tokens = loadTokens();
  const stored = tokens[serverName] ?? {};

  if (
    !forceRefresh &&
    stored.access_token &&
    Date.now() < (stored.expires_at ?? 0) - 60_000
  ) {
    return stored.access_token;
  }

  if (
    !forceRefresh &&
    stored.refresh_token &&
    stored.token_endpoint &&
    stored.client_id
  ) {
    try {
      log(`Refreshing ${serverName} token...\n`);
      const data = await refreshAccessToken({
        tokenEndpoint: stored.token_endpoint,
        refreshToken: stored.refresh_token,
        clientId: stored.client_id,
        clientSecret: stored.client_secret,
      });
      const updated: StoredToken = {
        ...stored,
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? stored.refresh_token,
        expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      tokens[serverName] = updated;
      saveTokens(tokens);
      return updated.access_token!;
    } catch (e) {
      log(`Refresh failed (${(e as Error).message}), re-authorizing...\n`);
    }
  }

  log(`Discovering OAuth metadata for ${serverName}...\n`);
  const meta = await discoverOAuth(serverConfig.url);

  // Start the callback server first so we know the exact port before registering.
  // OAuth servers (like Atlassian) require an exact redirect_uri match.
  const { port, codePromise } = await startCallbackServer();
  const redirectUri = `http://localhost:${port}`;

  // Always register a fresh client per auth flow so the redirect_uri matches exactly.
  // The stored client_id is only kept for token refresh (which doesn't need redirect_uri).
  log(`Registering OAuth client...\n`);
  const reg = await registerClient(meta.registration_endpoint, redirectUri);
  const clientId = reg.client_id;
  const clientSecret = reg.client_secret;
  const verifier = pkceVerifier();
  const challenge = pkceChallenge(verifier);

  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  log(`\nOpening browser for ${serverName} authorization...\n${authUrl}\n\n`);
  openBrowser(authUrl.toString());

  const code = await codePromise;

  log(`Exchanging authorization code...\n`);
  const tokenData = await exchangeCode({
    tokenEndpoint: meta.token_endpoint,
    code,
    clientId,
    clientSecret,
    redirectUri,
    codeVerifier: verifier,
  });

  const newEntry: StoredToken = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
    client_id: clientId,
    client_secret: clientSecret,
    token_endpoint: meta.token_endpoint,
  };
  tokens[serverName] = newEntry;
  saveTokens(tokens);

  log(`Authorized! Token stored at ${TOKENS_PATH}\n\n`);
  return newEntry.access_token!;
}
