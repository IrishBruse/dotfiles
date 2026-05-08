#!/usr/bin/env node
import { readFileSync } from "node:fs";

const ESC = "\x1b";
const ANSI_RESET = `${ESC}[0m`;
const ANSI_FG_GRAY = `${ESC}[90m`;
const ANSI_FG_BRIGHT_RED = `${ESC}[91m`;
const ANSI_FG_BRIGHT_YELLOW = `${ESC}[93m`;
const ANSI_FG_WHITE = `${ESC}[37m`;
const ANSI_SGR_SEQ_RE = new RegExp(`${ESC}\\[[\\d;]*m`, "g");

/** @param {string} s */
function stripAnsi(s) {
  return s.replace(ANSI_SGR_SEQ_RE, "");
}

/** @param {number | null | undefined} tokenCount */
function fmtk(tokenCount) {
  if (tokenCount == null) return "?";
  const roundedK = Math.round(tokenCount / 100) / 10;
  const whole = Math.floor(roundedK);
  const tenths = Math.round(roundedK * 10) % 10;
  return `${whole}.${tenths}k`;
}

/** @param {number | null | undefined} usedTokens */
function usageColorAnsi(usedTokens) {
  const n = usedTokens ?? 0;
  if (n > 100_000) return ANSI_FG_BRIGHT_RED;
  if (n > 80_000) return ANSI_FG_BRIGHT_YELLOW;
  return ANSI_FG_WHITE;
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

/** Drop ~/git/ so repos read shorter under a git work root */
/** @param {string} path */
function stripHomeGitPrefix(path) {
  const prefix = "~/git/";
  if (path.startsWith(prefix)) return path.slice(prefix.length);
  return path;
}

const ELL = "...";

/** Truncate path keeping the start (pwd on the left) */
/** @param {string} path @param {number} maxLen */
function shortenPathKeepLeft(path, maxLen) {
  if (path.length <= maxLen) return path;
  if (maxLen <= ELL.length) return path.slice(0, maxLen);
  return `${path.slice(0, maxLen - ELL.length)}${ELL}`;
}

/** @param {string} label @param {number} maxPlainLen */
function truncateModelPlain(label, maxPlainLen) {
  if (label.length <= maxPlainLen) return label;
  if (maxPlainLen <= ELL.length) return label.slice(0, maxPlainLen);
  return `${label.slice(0, maxPlainLen - ELL.length)}${ELL}`;
}

/**
 * One line: cwd, two spaces, model + usage. Width never exceeds cols.
 * @param {number} cols
 * @param {string} usageTone
 * @param {string} modelLabel
 * @param {string} usageDisplay
 * @param {string} limitDisplay
 * @param {string} cwdPlain
 */
function layoutPwdLeft(
  cols,
  usageTone,
  modelLabel,
  usageDisplay,
  limitDisplay,
  cwdPlain,
) {
  const gapCwdModel = 2;
  let m = modelLabel;
  let cwd = cwdPlain;

  /** Two spaces between cwd and model block */
  function lineAnsi() {
    return `${ANSI_FG_GRAY}${cwd}${ANSI_RESET}${" ".repeat(gapCwdModel)}${ANSI_FG_GRAY}${m}  ${ANSI_RESET}${usageTone}${usageDisplay}/${limitDisplay}${ANSI_RESET}`;
  }

  function totalWidth() {
    return stripAnsi(lineAnsi()).length;
  }

  const usageTailPlain = `  ${usageDisplay}/${limitDisplay}`;

  function suffixLen(modelPart) {
    return modelPart.length + usageTailPlain.length;
  }

  for (let i = 0; i < 500 && totalWidth() > cols; i++) {
    const cwdLen = cwd.length;
    const sufLen = suffixLen(m);

    if (cwdLen > sufLen && cwdLen > 12) {
      cwd = shortenPathKeepLeft(cwdPlain, cwdLen - 1);
      continue;
    }

    const maxModel = cols - gapCwdModel - cwdLen - usageTailPlain.length;
    if (maxModel >= ELL.length && m.length > maxModel) {
      m = truncateModelPlain(modelLabel, maxModel);
      continue;
    }

    if (cwdLen > 1) {
      cwd = shortenPathKeepLeft(cwdPlain, cwdLen - 1);
      continue;
    }

    m = truncateModelPlain(modelLabel, Math.max(ELL.length, maxModel));
    break;
  }

  while (totalWidth() > cols) {
    const cwdLen = cwd.length;
    const sufLen = suffixLen(m);
    if (cwdLen > 1 && cwdLen >= sufLen) {
      cwd = shortenPathKeepLeft(cwdPlain, cwdLen - 1);
      continue;
    }
    const budget = cols - gapCwdModel - cwdLen - usageTailPlain.length;
    if (budget >= ELL.length && suffixLen(m) > cols - gapCwdModel - cwdLen) {
      m = truncateModelPlain(modelLabel, budget);
      continue;
    }
    if (cwdLen > 1) {
      cwd = shortenPathKeepLeft(cwdPlain, cwdLen - 1);
      continue;
    }
    break;
  }

  return lineAnsi();
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

const usageTone = usageColorAnsi(totalInputTokens);
const cwdRaw = payload.cwd ?? payload.workspace?.current_dir ?? "";
const cwdDisplay =
  cwdRaw === "" ? "?" : stripHomeGitPrefix(pwdWithHomeTilde(cwdRaw));

const cols = Math.max(1, payload.render_width_chars ?? 80);
const line = layoutPwdLeft(
  cols,
  usageTone,
  modelLabel,
  usageDisplay,
  limitDisplay,
  cwdDisplay,
);

process.stdout.write(`${line}\n`);
