const fs = require("fs")
const path = require("path")

const APPDATA = process.env.APPDATA
const LOCALAPPDATA = process.env.LOCALAPPDATA
const USERPROFILE = process.env.USERPROFILE

// Source, Base, Target
link("/alacritty/", APPDATA, "/alacritty/");
link("/PowerToys/", LOCALAPPDATA, "/Microsoft/PowerToys/");
link("/WindowsPowerShell/", USERPROFILE, "/Documents/WindowsPowerShell/");

link("/files/.gitconfig", USERPROFILE, "/.gitconfig");

link("/vscode/", APPDATA, "/Code/User/");

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
