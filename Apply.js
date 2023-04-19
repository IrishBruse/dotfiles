const fs = require("fs")
const path = require("path")

const APPDATA_ROAMING = process.env.APPDATA
const APPDATA_LOCAL = process.env.LOCALAPPDATA
const USERPROFILE = process.env.USERPROFILE
const ProgramFiles = process.env.ProgramFiles

// Source, Base, Target
link("/alacritty/", APPDATA_ROAMING, "/alacritty/");
link("/PowerToys/", APPDATA_LOCAL, "/Microsoft/PowerToys/");
link("/WindowsPowerShell/", USERPROFILE, "/Documents/WindowsPowerShell/");
link("/Startup/", APPDATA_ROAMING, "/Microsoft/Windows/Start Menu/Programs/Setup/");
link("/Ditto/", APPDATA_ROAMING, "/Ditto/");

link("/vscode/", APPDATA_ROAMING, "/Code/User/");

link("/files/.gitconfig", USERPROFILE, "/.gitconfig");
link("/shell/shell.nss", ProgramFiles, "/Nilesoft Shell/shell.nss");

function link(local, base, target)
{
    let source = path.join(__dirname, local);
    let dest = path.join(base, target);
    let typeCondition = dest.charAt(dest.length - 1) == '/' | dest.charAt(dest.length - 1) == '\\';
    let type = typeCondition ? "dir" : "file";

    console.log(dest + " " + type);

    if (!fs.existsSync(dest))
    {
        fs.symlinkSync(source, dest, type);
        console.log(`Linked ${type} ${source} to ${dest}`);
        return;
    }
    else
    {
        let stat = fs.statSync(dest);

        if (stat.isSymbolicLink())
        {
            fs.unlinkSync(dest);
            fs.symlinkSync(source, dest, type);
            return;
        }
        else if (stat.isFile())
        {
            fs.rmSync(dest)
        }
        else if (!stat.isFile())
        {
            console.log(dest + " " + type + " is not a file");
        }
    }
}
