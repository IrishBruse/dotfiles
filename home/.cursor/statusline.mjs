#!/usr/bin/env node
import { readFileSync } from "node:fs";

const ESC = "\x1b";
const ANSI_FG_GRAY = `${ESC}[90m`;
/** @param {number | null | undefined} tokenCount */
function fmtk(tokenCount) {
  if (tokenCount == null) return "?";
  const roundedK = Math.round(tokenCount / 100) / 10;
  const whole = Math.floor(roundedK);
  const tenths = Math.round(roundedK * 10) % 10;
  return `${whole}.${tenths}k`;
}

/** @param {{ id?: string, display_name?: string }} model */
function guessedContextLimit(model) {
  const id = String(model.id ?? "").toLowerCase();
  const name = String(model.display_name ?? "");
  if (id.includes("composer-2")) return 200_000;
  if (/composer\s*2(?!\d)/i.test(name)) return 200_000;
  return 100_000;
}

/** @param {string} path */
function pwdWithHomeTilde(path) {
  const home = process.env.HOME ?? "";
  if (path === "" || home === "") return path;
  const homeNorm = home.endsWith("/") ? home.slice(0, -1) : home;
  if (path === homeNorm) return "~";
  if (path.startsWith(`${homeNorm}/`)) return `~${path.slice(homeNorm.length)}`;
  return path;
}

const payload = JSON.parse(readFileSync(0, "utf8"));
const contextWindow = payload.context_window ?? {};
const totalInputTokens = contextWindow.total_input_tokens;
const model = payload.model ?? {};
const effectiveLimit =
  contextWindow.context_window_size ?? guessedContextLimit(model);
const limitDisplay = fmtk(effectiveLimit);
const modelLabel = model.display_name ?? model.id ?? "?";
const hasContextUsage = totalInputTokens != null && totalInputTokens > 0;
const cwdRaw = payload.cwd ?? payload.workspace?.current_dir ?? "";
const cwdDisplay = cwdRaw === "" ? "?" : pwdWithHomeTilde(cwdRaw);

const contextSegment = hasContextUsage
  ? `  ${fmtk(totalInputTokens)}/${limitDisplay}`
  : "";
const line = `${ANSI_FG_GRAY}${cwdDisplay}  ${modelLabel}${contextSegment}`;
process.stdout.write(`${line}\n`);
