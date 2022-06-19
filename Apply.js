const fs = require("fs")
const path = require("path")

let folders = [
    { target: __dirname + "/Alacritty/", source: process.env.APPDATA + "/Alacritty/", type: "dir" },
    { target: __dirname + "/WindowsPowerShell/", source: process.env.USERPROFILE + "/Documents/WindowsPowerShell/", type: "dir" },
]

for (const folder of folders)
{
    console.log(`Linking ${folder.type} ${folder.target} to ${folder.source}`);

    if (fs.existsSync(folder.source))
    {
        fs.rmSync(folder.source, { recursive: true });
    }

    try
    {
        fs.symlinkSync(folder.target, folder.source, folder.type);
    }
    catch (error) { }
}
