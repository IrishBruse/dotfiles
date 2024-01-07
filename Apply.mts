import * as fs from "fs";
import * as path from "path";

const APPDATA_ROAMING = process.env.APPDATA;
const APPDATA_LOCAL = process.env.LOCALAPPDATA;
const USERPROFILE = process.env.USERPROFILE;
const ProgramFiles = process.env.ProgramFiles;

console.log("\n");

async function main() {
  link("./alacritty/", APPDATA_ROAMING + "/alacritty/");
  link("./WindowsPowerShell/", USERPROFILE + "/Documents/WindowsPowerShell/");
  link("./Ditto/", APPDATA_ROAMING + "/Ditto/");
  link("./nushell/", APPDATA_ROAMING + "/nushell/");
  link("./vscode/", APPDATA_ROAMING + "/Code/User/");

  link("./files/.gitconfig", USERPROFILE + "/.gitconfig", "file");
  link("./files/.wezterm.lua", USERPROFILE + "/.wezterm.lua", "file");

  link("./shell/imports/", ProgramFiles + "/Nilesoft Shell/imports/");
  link("./shell/shell.nss", ProgramFiles + "/Nilesoft Shell/shell.nss", "file");
  link("./shell/shell.log", ProgramFiles + "/Nilesoft Shell/shell.log", "file");

  const completitions = [
    {
      url: "https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/git/git-completions.nu",
      file: "git.nu",
    },
    {
      url: "https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/npm/npm-completions.nu",
      file: "npm.nu",
    },
    {
      url: "https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/yarn/yarn-v4-completions.nu",
      file: "yarn.nu",
    },
    {
      url: "https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/winget/winget-completions.nu",
      file: "winget.nu",
    },
  ];

  for (const completion of completitions) {
    await addCompletion(completion.url, completion.file);
  }
}

function link(source, target, type: fs.symlink.Type = "dir") {
  source = path.resolve(source);
  target = path.resolve(target);

  if (fs.existsSync(target)) {
    const stat = fs.statSync(target);

    if (stat.isSymbolicLink()) {
      try {
        fs.unlinkSync(target);
      } catch (e) {
        console.error("Failed to unlink target " + target);
        return;
      }
    } else {
      try {
        fs.rmSync(target, { force: true, recursive: true });
      } catch (e) {
        console.error("Failed to remove target " + target);
        return;
      }
    }
  }

  try {
    fs.symlinkSync(source, target, type);
  } catch (e) {
    console.error("Failed to symlink " + type, source + " to " + target);
    return;
  }

  console.log(`Linked ${type} ${source} to ${target}`);
}

async function addCompletion(url: string, filename: string) {
  let resp = await fetch(url);
  let text = await resp.text();

  fs.writeFileSync("nushell/completions/" + filename, text);
}

main();
