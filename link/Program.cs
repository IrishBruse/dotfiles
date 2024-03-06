string APPDATA_ROAMING = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
string ProgramFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
string USERPROFILE = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
// string APPDATA_LOCAL = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

Link("..\\alacritty\\", APPDATA_ROAMING + "\\alacritty\\");
Link("..\\WindowsPowerShell\\", USERPROFILE + "\\Documents\\WindowsPowerShell\\");
Link("..\\Ditto\\", APPDATA_ROAMING + "\\Ditto\\");
Link("..\\nushell\\", APPDATA_ROAMING + "\\nushell\\");
// Link("..\\vscode\\", APPDATA_ROAMING + "\\Code\\User\\"); // Only on desktop

Link("..\\files\\.gitconfig", USERPROFILE + "\\.gitconfig", true);
Link("..\\files\\.wezterm.lua", USERPROFILE + "\\.wezterm.lua", true);
Link("..\\lazygit\\config.yml", APPDATA_ROAMING + "\\lazygit\\config.yml", true);
Link("..\\shell\\imports\\", ProgramFiles + "\\Nilesoft Shell\\imports\\");
Link("..\\shell\\shell.nss", ProgramFiles + "\\Nilesoft Shell\\shell.nss", true);
Link("..\\shell\\shell.log", ProgramFiles + "\\Nilesoft Shell\\shell.log", true);

string[][] completitions = [
    ["https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/git/git-completions.nu","git.nu"],
    ["https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/npm/npm-completions.nu","npm.nu"],
    ["https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/yarn/yarn-v4-completions.nu","yarn.nu"],
    ["https://raw.githubusercontent.com/nushell/nu_scripts/main/custom-completions/winget/winget-completions.nu","winget.nu"],
];

foreach (string[] completion in completitions)
{
    await AddCompletion(completion[0], completion[1]);
}

static void Link(string source, string target, bool isFile = false)
{
    source = Path.GetFullPath(source);

    try
    {
        if (isFile)
        {
            File.Delete(target);
            _ = Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            _ = File.CreateSymbolicLink(target, source);
        }
        else
        {
            Directory.Delete(target, true);
            _ = Directory.CreateDirectory(Directory.GetParent(Path.GetDirectoryName(target)!)!.FullName);
            _ = Directory.CreateSymbolicLink(target, source);
        }
        Console.WriteLine("Linked " + Path.GetFullPath(source) + " -> " + target + " ");
    }
    catch (IOException)
    {
        Console.WriteLine("Skipped " + Path.GetFullPath(source) + " -> " + target + " ");
    }
    catch (Exception e)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(value: e.Message);
        Console.ResetColor();
    }
}

static async Task AddCompletion(string url, string filename)
{
    using HttpClient client = new();
    string test = await client.GetStringAsync(url);
    _ = File.WriteAllTextAsync("../nushell/completions/" + filename, test);
}
