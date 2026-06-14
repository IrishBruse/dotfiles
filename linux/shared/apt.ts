import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "../../shell.ts";

function aptManualPackages(): string {
  return $(
    "apt-mark showmanual | sort -u | xargs -r dpkg-query -W -f='${Package}\t${Version}\n' | sort"
  ).trim();
}

function aptMarkdownTable(packages: string): string {
  const rows = packages.split("\n").map((line) => {
    const tab = line.indexOf("\t");
    const pkg = line.slice(0, tab);
    const version = line.slice(tab + 1);
    return `|${pkg}|${version}|`;
  });

  return [
    "# apt",
    "",
    "|package|version|",
    "| --- | --- |",
    ...rows,
    ""
  ].join("\n");
}

export function exportAptMd(platformDir: string): void {
  const packages = aptManualPackages();
  if (!packages) {
    return;
  }
  writeFileSync(join(platformDir, "apt.md"), aptMarkdownTable(packages), "utf8");
}
