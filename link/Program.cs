using System.Runtime.InteropServices;

var APPDATA_ROAMING = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
var APPDATA_LOCAL = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
var USERPROFILE = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
var ProgramFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);

[DllImport("kernel32.dll")]
static extern bool CreateSymbolicLink(string lpSymlinkFileName, string lpTargetFileName, SymbolicLink dwFlags);





enum SymbolicLink
{
    File = 0,
    Directory = 1
}
