import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "../../shell.ts";

function aptManualPackages(): string {
  return $(
    "apt-mark showmanual | sort -u | xargs -r dpkg-query -W -f='${Package}\t${Version}\n' | sort"
  ).trim();
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function aptCsv(packages: string): string {
  const rows = packages.split("\n").map((line) => {
    const tab = line.indexOf("\t");
    const pkg = line.slice(0, tab);
    const version = line.slice(tab + 1);
    return `${csvField(pkg)},${csvField(version)}`;
  });

  return ["package,version", ...rows, ""].join("\n");
}

export function exportAptCsv(platformDir: string): void {
  const packages = aptManualPackages();
  if (!packages) {
    return;
  }
  writeFileSync(join(platformDir, "apt.csv"), aptCsv(packages), "utf8");
}
