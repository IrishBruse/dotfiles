import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const stock = execSync(
  "zcat /var/log/installer/initial-status.gz | sed -n 's/^Package: //p'"
)
  .toString()
  .split("\n");

const current = execSync("dpkg-query -W -f='${Package}\n' | cut -d':' -f1")
  .toString()
  .split("\n");

var unique = [...stock, ...current].filter(
  (item, i, array) => array.indexOf(item) === array.lastIndexOf(item)
);

const ignore = readFileSync("misc/apt/ignore.pkgs").toString().split("\n");

let out = "";

for (const element of unique) {
  if (ignore.includes(element)) {
    continue;
  }
  out += element + "\n";
}

writeFileSync("misc/apt.pkgs", out);
