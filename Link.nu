let test = $'($env.APPDATA)\Microsoft\Windows\Start Menu\Programs\Startup'



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
