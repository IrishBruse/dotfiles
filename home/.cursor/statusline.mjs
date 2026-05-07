#!/usr/bin/env node
import { readFileSync } from "node:fs";

/** @param {string} s */
function stripAnsi(s) {
  return s.replace(/\x1b\[[\d;]*m/g, "");
}

/** @param {number | null | undefined} tokenCount */
function fmtk(tokenCount) {
  if (tokenCount == null) return "?";
  const roundedK = Math.round(tokenCount / 100) / 10;
  const whole = Math.floor(roundedK);
  const tenths = Math.round(roundedK * 10) % 10;
  return `${whole}.${tenths}k`;
}

/**
 * @param {number | null | undefined} used
 * @param {number | null | undefined} limit
 */
function usageColorAnsi(used, limit) {
  const usedTokens = used ?? 0;
  const limitTokens = limit ?? 100_000;
  if (limitTokens <= 0) return "\x1b[37m";
  if (usedTokens > limitTokens) return "\x1b[91m";
  const pct = (usedTokens / limitTokens) * 100;
  if (pct >= 80) return "\x1b[93m";
  return "\x1b[37m";
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
const usageDisplay =
  totalInputTokens == null || totalInputTokens === 0
    ? "0"
    : fmtk(totalInputTokens);
const limitDisplay = fmtk(effectiveLimit);
const modelLabel = model.display_name ?? model.id ?? "?";

const usageTone = usageColorAnsi(totalInputTokens, effectiveLimit);
const cwdRaw = payload.cwd ?? payload.workspace?.current_dir ?? "";
const cwdDisplay =
  cwdRaw === "" ? "?" : pwdWithHomeTilde(cwdRaw);

const left = `\x1b[90m${modelLabel}  \x1b[0m${usageTone}${usageDisplay}/${limitDisplay}\x1b[0m`;
const right = `\x1b[90m${cwdDisplay}\x1b[0m`;
const cols = payload.render_width_chars ?? 80;
const gap = Math.max(
  1,
  cols - stripAnsi(left).length - stripAnsi(right).length,
);

process.stdout.write(`${left}${" ".repeat(gap)}${right}\n`);
