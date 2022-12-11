const fs = require("fs")
const path = require("path")

let symlinks = [
    { target: __dirname + "/alacritty/", source: process.env.APPDATA + "/alacritty/", type: "dir" },
    { target: __dirname + "/PowerToys/", source: process.env.LOCALAPPDATA + "/Microsoft/PowerToys/", type: "dir" },
    { target: __dirname + "/WindowsPowerShell/", source: process.env.USERPROFILE + "/Documents/WindowsPowerShell/", type: "dir" },
    { target: __dirname + "/files/.gitconfig", source: process.env.USERPROFILE + "/.gitconfig", type: "file" },
]

for (const symlink of symlinks)
{
    console.log(`Linking ${symlink.type} ${symlink.target} to ${symlink.source}`);

    if (symlink.type == "dir" && fs.existsSync(symlink.source))
    {
        fs.rmSync(symlink.source, { recursive: true });
    }

    try
    {
        fs.symlinkSync(symlink.target, symlink.source, symlink.type);
    }
    catch (e) { }
}
