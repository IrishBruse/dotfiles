const fs = require("fs")
const path = require("path")

const APPDATA_ROAMING = process.env.APPDATA
const APPDATA_LOCAL = process.env.LOCALAPPDATA
const USERPROFILE = process.env.USERPROFILE

// Source, Base, Target
link("/alacritty/", APPDATA_ROAMING, "/alacritty/");
link("/PowerToys/", APPDATA_LOCAL, "/Microsoft/PowerToys/");
link("/WindowsPowerShell/", USERPROFILE, "/Documents/WindowsPowerShell/");
link("/Startup/", APPDATA_ROAMING, "/Microsoft/Windows/Start Menu/Programs/Setup/");
link("/Ditto/", APPDATA_ROAMING, "/Ditto/");

link("/vscode/", APPDATA_ROAMING, "/Code/User/");

link("/files/.gitconfig", USERPROFILE, "/.gitconfig");

function link(local, base, target)
{
    let source = path.join(__dirname, local);
    let dest = path.join(base, target);
    let type = (dest.charAt(dest.length - 1) == '/' || dest.charAt(dest.length - 1) == '\\') ? "dir" : "file";

    if (type == "dir" && fs.existsSync(dest))
    {
        fs.rmdirSync(dest);
    }
    else if (type == "file" && fs.existsSync(dest))
    {
        fs.rmSync(dest);
    }

    try
    {
        fs.symlinkSync(source, dest, type);
    }
    catch (e)
    {
        console.log(e.message);
        return
    }

    console.log(`Linked ${type} ${source} to ${dest}`);
}
