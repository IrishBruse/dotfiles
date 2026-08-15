#!/usr/bin/env node
/// <reference types="node" />

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { q } from "../shell.ts";

const CMD = "install-mint-github";
const LINUX_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = fileURLToPath(import.meta.url);

const CINNAMON_REPOS = [
  "cinnamon-desktop",
  "cjs",
  "muffin",
  "cinnamon-session",
  "cinnamon-settings-daemon",
  "cinnamon-screensaver",
  "cinnamon",
  "xapp",
  "mintupdate"
] as const;

const CINNAMON_INSTALL_PATTERNS = [
  "cinnamon-desktop/packages/cinnamon-desktop-data_*.deb",
  "cinnamon-desktop/packages/libcinnamon-desktop4_*.deb",
  "cinnamon-desktop/packages/libcvc0_*.deb",
  "cinnamon-desktop/packages/gir1.2-cinnamondesktop-3.0_*.deb",
  "cinnamon-desktop/packages/gir1.2-cvc-1.0_*.deb",
  "cjs/packages/libcjs0_*.deb",
  "cjs/packages/cjs_*.deb",
  "muffin/packages/muffin-common_*.deb",
  "muffin/packages/libmuffin0_*.deb",
  "muffin/packages/gir1.2-meta-muffin-0.0_*.deb",
  "muffin/packages/muffin_*.deb",
  "cinnamon-session/packages/cinnamon-session-common_*.deb",
  "cinnamon-session/packages/cinnamon-session_*.deb",
  "cinnamon-settings-daemon/packages/cinnamon-settings-daemon_*.deb",
  "cinnamon-screensaver/packages/cinnamon-screensaver_*.deb",
  "cinnamon/packages/cinnamon-common_*.deb",
  "cinnamon/packages/cinnamon_*.deb",
  "xapp/packages/xapps-common_*.deb",
  "xapp/packages/libxapp1_*.deb",
  "xapp/packages/gir1.2-xapp-1.0_*.deb",
  "mintupdate/packages/mintupdate_*.deb"
] as const;

const CINNAMON_DBG_PATTERNS = [
  "cinnamon-desktop/packages/libcinnamon-desktop-dbg_*.deb",
  "cinnamon-desktop/packages/libcvc-dbg_*.deb",
  "cjs/packages/libcjs-dbg_*.deb",
  "muffin/packages/muffin-dbg_*.deb",
  "cinnamon-settings-daemon/packages/cinnamon-settings-daemon-dbg_*.deb",
  "cinnamon-screensaver/packages/libcscreensaver-dbg_*.deb",
  "cinnamon/packages/cinnamon-dbg_*.deb"
] as const;

type ChangeKind = "new" | "upgraded" | "same" | "downgraded" | "changed";

type ReportRow = {
  package: string;
  before: string;
  after: string;
  kind: ChangeKind;
};

function die(message: string): void {
  console.error(`${CMD}: ${message}`);
  process.exit(1);
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8" }).trimEnd();
}

function runInherit(cmd: string, args: string[]): void {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runShInherit(command: string): void {
  execFileSync("sh", ["-c", command], { stdio: "inherit" });
}

function commandExists(name: string): boolean {
  return spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" }).status === 0;
}

function requireCommands(names: string[]): void {
  for (const name of names) {
    if (!commandExists(name)) {
      die(`${name} is required`);
    }
  }
}

function requireRoot(): void {
  if (process.getuid?.() === 0) {
    return;
  }
  if (!commandExists("sudo")) {
    die("sudo is required");
  }
  const result = spawnSync("sudo", [process.execPath, SCRIPT_PATH], {
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
}

function logStep(message: string): void {
  console.log(`==> ${message}`);
}

function logDetail(message: string): void {
  console.log(`    ${message}`);
}

function defaultReleaseTag(): string {
  const infoPath = "/etc/linuxmint/info";
  if (!fs.existsSync(infoPath)) {
    return "master.mint22";
  }
  const release = fs
    .readFileSync(infoPath, "utf8")
    .split("\n")
    .find((line) => line.startsWith("RELEASE="))
    ?.slice("RELEASE=".length)
    .trim();
  const match = release?.match(/^(\d+)/);
  return match ? `master.mint${match[1]}` : "master.mint22";
}

function dpkgCompare(a: string, op: "gt" | "lt" | "eq", b: string): boolean {
  return spawnSync("dpkg", ["--compare-versions", a, op, b], { encoding: "utf8" }).status === 0;
}

function installedVersion(pkg: string): string {
  const result = spawnSync("dpkg-query", ["-W", "-f=${Version}", pkg], {
    encoding: "utf8"
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function pkgInstalled(pkg: string): boolean {
  return spawnSync("dpkg", ["-s", pkg], { encoding: "utf8" }).status === 0;
}

function debField(deb: string, field: "Package" | "Version"): string {
  return run("dpkg-deb", ["-f", deb, field]);
}

function changeKind(before: string, after: string): ChangeKind {
  if (!before) {
    return "new";
  }
  if (before === after) {
    return "same";
  }
  if (dpkgCompare(after, "gt", before)) {
    return "upgraded";
  }
  if (dpkgCompare(after, "lt", before)) {
    return "downgraded";
  }
  return "changed";
}

function globDebs(workDir: string, pattern: string): string[] {
  const slash = pattern.lastIndexOf("/");
  const dir = path.join(workDir, pattern.slice(0, slash));
  const glob = pattern.slice(slash + 1);
  const re = new RegExp(`^${glob.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => re.test(name))
    .map((name) => path.join(dir, name));
}

function resolveDeb(workDir: string, pattern: string): string {
  const matches = globDebs(workDir, pattern);
  if (matches.length === 0) {
    die(`missing package for pattern: ${pattern}`);
  }
  if (matches.length > 1) {
    die(`multiple packages match pattern: ${pattern}`);
  }
  return matches[0];
}

function resolveDebOptional(workDir: string, pattern: string): string | undefined {
  const matches = globDebs(workDir, pattern);
  if (matches.length !== 1) {
    return undefined;
  }
  return matches[0];
}

function snapshotBefore(debs: string[]): Map<string, string> {
  const before = new Map<string, string>();
  for (const deb of debs) {
    const pkg = debField(deb, "Package");
    before.set(pkg, installedVersion(pkg));
  }
  return before;
}

function rowsAfterInstall(
  debs: string[],
  beforeVersions: Map<string, string>
): ReportRow[] {
  return debs.map((deb) => {
    const pkg = debField(deb, "Package");
    const before = beforeVersions.get(pkg) ?? "";
    const after = installedVersion(pkg);
    return { package: pkg, before, after, kind: changeKind(before, after) };
  });
}

function countKind(rows: ReportRow[], kind: ChangeKind): number {
  return rows.filter((row) => row.kind === kind).length;
}

function printReport(title: string, rows: ReportRow[]): void {
  const sorted = [...rows].sort((a, b) => a.package.localeCompare(b.package, "en"));
  let widthPkg = 8;
  let widthBefore = 6;
  let widthAfter = 5;

  for (const row of sorted) {
    widthPkg = Math.max(widthPkg, row.package.length);
    const beforeLabel = row.before || "not installed";
    widthBefore = Math.max(widthBefore, beforeLabel.length);
    widthAfter = Math.max(widthAfter, row.after.length);
  }

  const rule = "-".repeat(widthPkg + widthBefore + widthAfter + 6);

  console.log();
  console.log("================================================================");
  console.log(` ${title}`);
  console.log("================================================================");
  console.log(
    ` ${"package".padEnd(widthPkg)}  ${"before".padEnd(widthBefore)}  ${"after".padEnd(widthAfter)}  change`
  );
  console.log(` ${rule}`);

  for (const row of sorted) {
    const beforeLabel = row.before || "not installed";
    console.log(
      ` ${row.package.padEnd(widthPkg)}  ${beforeLabel.padEnd(widthBefore)}  ${row.after.padEnd(widthAfter)}  ${row.kind}`
    );
  }

  console.log();
  console.log(
    ` Summary: ${countKind(sorted, "new")} new, ${countKind(sorted, "upgraded")} upgraded, ${countKind(sorted, "same")} same, ${countKind(sorted, "downgraded")} downgraded`
  );
  console.log();
}

function printInstalledReport(
  title: string,
  debs: string[],
  beforeVersions: Map<string, string>
): void {
  printReport(title, rowsAfterInstall(debs, beforeVersions));
}

function collectCinnamonDebs(workDir: string): string[] {
  const debs = CINNAMON_INSTALL_PATTERNS.map((pattern) =>
    resolveDeb(workDir, pattern)
  );

  for (const pattern of CINNAMON_DBG_PATTERNS) {
    const deb = resolveDebOptional(workDir, pattern);
    if (!deb) {
      continue;
    }
    const pkg = debField(deb, "Package");
    if (pkgInstalled(pkg)) {
      debs.push(deb);
    }
  }

  return debs;
}

function removePath(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  } catch {
    if (!commandExists("sudo")) {
      die(`cannot remove ${dir} (try: sudo rm -rf ${q(dir)})`);
    }
    logDetail(`removing ${dir} with sudo`);
    runInherit("sudo", ["rm", "-rf", dir]);
  }
}

function removeRootOwnedPackageDirs(workDir: string): void {
  const dirs = CINNAMON_REPOS
    .map((repo) => path.join(workDir, repo, "packages"))
    .filter((dir) => fs.existsSync(dir));

  const needSudo = dirs.filter((dir) => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return false;
    } catch {
      return true;
    }
  });

  if (needSudo.length === 0) {
    return;
  }

  if (!commandExists("sudo")) {
    die(`cannot remove old packages (try: sudo rm -rf ${q(needSudo[0])})`);
  }

  logStep(`Remove ${needSudo.length} old package dirs (sudo)`);
  runInherit("sudo", ["rm", "-rf", ...needSudo]);
}

function downloadCinnamonArchives(workDir: string, tag: string): void {
  removeRootOwnedPackageDirs(workDir);
  const total = CINNAMON_REPOS.length;
  for (let index = 0; index < CINNAMON_REPOS.length; index++) {
    const repo = CINNAMON_REPOS[index];
    const dest = path.join(workDir, repo);
    const url = `https://github.com/linuxmint/${repo}/releases/download/${tag}/packages.tar.gz`;
    logStep(`[${index + 1}/${total}] Download ${repo} (${tag})`);
    fs.mkdirSync(dest, { recursive: true });
    runInherit("curl", ["-fsSL", "-o", path.join(dest, "packages.tar.gz"), url]);
    removePath(path.join(dest, "packages"));
    runInherit("tar", ["-xzf", path.join(dest, "packages.tar.gz"), "-C", dest]);
    fs.rmSync(path.join(dest, "packages.tar.gz"), { force: true });
    const names = fs
      .readdirSync(path.join(dest, "packages"))
      .filter((name) => name.endsWith(".deb"))
      .join(", ");
    logDetail(names);
  }
}

function removeStaleLocalMuffin(): void {
  const libdir = "/usr/local/lib/x86_64-linux-gnu";
  if (
    !fs.existsSync(path.join(libdir, "libmuffin.so.0")) &&
    !fs.existsSync(path.join(libdir, "muffin"))
  ) {
    return;
  }
  logStep("Remove stale /usr/local muffin libraries");
  runShInherit(`rm -f ${q(libdir)}/libmuffin.so*`);
  runShInherit(`rm -rf ${q(path.join(libdir, "muffin"))}`);
  runInherit("ldconfig", []);
}

function installDebs(debs: string[]): Map<string, string> {
  const beforeVersions = snapshotBefore(debs);
  logStep(`Install ${debs.length} packages`);
  runInherit("dpkg", ["-i", ...debs]);
  runInherit("apt-get", ["check"]);
  return beforeVersions;
}

function verifyCinnamonInstall(): void {
  logStep("Verify install");
  const result = spawnSync(
    "gsettings",
    ["get", "org.cinnamon.desktop.wm.preferences", "prevent-focus-stealing"],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    die(
      "missing GSettings key prevent-focus-stealing (cinnamon-desktop schemas may be mismatched)"
    );
  }
  logDetail(run("cinnamon", ["--version"]));
  console.log();
  console.log("Log out and back in, or run: cinnamon --replace &");
}

function installCinnamonFromWorkDir(workDir: string, tag: string): void {
  const debs = collectCinnamonDebs(workDir);
  const beforeVersions = installDebs(debs);
  printInstalledReport(`Update report: Cinnamon stack (${tag})`, debs, beforeVersions);
  removeStaleLocalMuffin();
  verifyCinnamonInstall();
}

function installMintsysadmDeb(pkgDir: string, ref: string): void {
  const deb = latestMintsysadmDeb(pkgDir);
  if (!deb) {
    die(`no mintsysadm .deb in ${pkgDir}`);
  }
  const beforeVersions = snapshotBefore([deb]);
  logStep(`Install ${path.basename(deb)}`);
  runInherit("apt-get", ["install", "-y", deb]);
  printInstalledReport(`Update report: mintsysadm (${ref})`, [deb], beforeVersions);
}

function latestMintsysadmDeb(pkgDir: string): string | undefined {
  if (!fs.existsSync(pkgDir)) {
    return undefined;
  }
  const debs = fs
    .readdirSync(pkgDir)
    .filter((name) => name.startsWith("mintsysadm_") && name.endsWith(".deb"));
  if (debs.length === 0) {
    return undefined;
  }
  return debs
    .map((name) => path.join(pkgDir, name))
    .sort((a, b) => {
      const va = debField(a, "Version");
      const vb = debField(b, "Version");
      if (dpkgCompare(va, "gt", vb)) {
        return 1;
      }
      if (dpkgCompare(va, "lt", vb)) {
        return -1;
      }
      return 0;
    })
    .at(-1);
}

function cloneOrUpdateMintsysadm(srcDir: string, ref: string): void {
  if (fs.existsSync(path.join(srcDir, ".git"))) {
    logStep(`Update mintsysadm source (${ref})`);
    runInherit("git", ["-C", srcDir, "fetch", "--depth", "1", "origin", ref]);
    runInherit("git", ["-C", srcDir, "checkout", "FETCH_HEAD"]);
  } else {
    logStep(`Clone mintsysadm (${ref})`);
    fs.rmSync(srcDir, { recursive: true, force: true });
    runInherit("git", [
      "clone",
      "--depth",
      "1",
      "--branch",
      ref,
      "https://github.com/linuxmint/mintsysadm.git",
      srcDir
    ]);
  }
  logDetail(`commit ${run("git", ["-C", srcDir, "rev-parse", "--short", "HEAD"])}`);
}

function buildMintsysadm(workDir: string, srcDir: string, pkgDir: string): string {
  logStep("Build mintsysadm");
  runInherit("make", ["-C", srcDir]);
  for (const name of fs.readdirSync(workDir)) {
    if (
      name.startsWith("mintsysadm_") &&
      (name.endsWith(".deb") || name.endsWith(".buildinfo") || name.endsWith(".changes"))
    ) {
      fs.rmSync(path.join(workDir, name), { force: true });
    }
  }
  runShInherit(`cd ${q(srcDir)} && dpkg-buildpackage -us -uc -b`);
  const built = fs
    .readdirSync(workDir)
    .find((name) => name.startsWith("mintsysadm_") && name.endsWith(".deb"));
  if (!built) {
    die("build did not produce a .deb");
  }
  const deb = path.join(workDir, built);
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.copyFileSync(deb, path.join(pkgDir, built));
  logDetail(`built ${built}`);
  return path.join(pkgDir, built);
}

function runInstall(): void {
  if (process.argv.length > 2) {
    die("this script takes no arguments");
  }

  const cinnamonWorkDir = path.join(LINUX_DIR, "cinnamon-github-release");
  const mintsysadmWorkDir = path.join(LINUX_DIR, "mintsysadm-github-release");
  const mintsysadmSrcDir = path.join(mintsysadmWorkDir, "src");
  const mintsysadmPkgDir = path.join(mintsysadmWorkDir, "packages");
  const tag = defaultReleaseTag();
  const ref = "master";
  const isRoot = process.getuid?.() === 0;

  if (!isRoot) {
    requireCommands(["curl", "tar", "git", "make", "dpkg-buildpackage"]);

    logStep(`Release tag: ${tag}`);
    logStep(`Cinnamon work dir: ${cinnamonWorkDir}`);
    fs.mkdirSync(cinnamonWorkDir, { recursive: true });
    downloadCinnamonArchives(cinnamonWorkDir, tag);

    logStep(`Git ref: ${ref}`);
    logStep(`mintsysadm work dir: ${mintsysadmWorkDir}`);
    fs.mkdirSync(mintsysadmWorkDir, { recursive: true });
    cloneOrUpdateMintsysadm(mintsysadmSrcDir, ref);
    buildMintsysadm(mintsysadmWorkDir, mintsysadmSrcDir, mintsysadmPkgDir);

    requireRoot();
    return;
  }

  requireCommands(["dpkg"]);
  installCinnamonFromWorkDir(cinnamonWorkDir, tag);
  installMintsysadmDeb(mintsysadmPkgDir, ref);
}

runInstall();
