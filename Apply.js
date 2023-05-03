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
link("/Ditto/", APPDATA_ROAMING, "/Ditto/");

link("/vscode/", APPDATA_ROAMING, "/Code/User/");

link("/files/.gitconfig", USERPROFILE, "/.gitconfig");

link("/shell/imports/", ProgramFiles, "/Nilesoft Shell/imports/");
link("/shell/shell.nss", ProgramFiles, "/Nilesoft Shell/shell.nss");

function link(local, base, target)
{
    let source = path.join(__dirname, local);
    let dest = path.join(base, target);
    let typeCondition = dest.charAt(dest.length - 1) == '/' | dest.charAt(dest.length - 1) == '\\';
    let type = typeCondition ? "dir" : "file";

    if (fs.existsSync(dest))
    {
        let stat = fs.statSync(dest);

        if (stat.isSymbolicLink())
        {
            try
            {
                fs.unlinkSync(dest);
            }
            catch (e)
            {
                console.error(e.message);
            }
        }
        else
        {
            if (stat.isFile())
            {
                fs.rmSync(dest)
            }
            else if (!stat.isFile())
            {
                try
                {
                    fs.rmSync(dest, { recursive: true, force: true });
                }
                catch (e)
                {
                    console.error(e.message);
                }
            }
        }
    }

    try
    {
        fs.symlinkSync(source, dest, type);
    }
    catch (e)
    {
        console.error(e.message);
    }

    console.log(`Linked ${type} ${source} to ${dest}`);
}
