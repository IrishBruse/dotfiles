# Modules
$ENV:EDITOR = "code"
$ENV:VISUAL = "code"

Clear-Host

# Remove useless ugly beep
Set-PSReadlineOption -BellStyle None

function prompt {
    # Assign Windows Title Text
    $host.ui.RawUI.WindowTitle = "Powershell - $pwd";

    Write-Host "$pwd " -NoNewline

    # Print -> arrow pompt
    $Host.UI.Write($([char]0x2192))
    return " "
}

# Determine if PowerShell launched with admin priveleges
# Thanks https://stackoverflow.com/questions/9999963/powershell-test-admin-rights-within-powershell-script#10000292
function Test-IsAdmin() {
    try {
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal -ArgumentList $identity
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    }
    catch {
        throw "Failed to determine if the current user has elevated privileges. The error was: '{0}'." -f $_
    }
}

If (Test-IsAdmin) {
    $ui.WindowTitle = "Administrator: M$ PowerShell"
}
else {
    $ui.WindowTitle = "M$ PowerShell"
}

# Import the Chocolatey Profile that contains the necessary code to enable
# tab-completions to function for `choco`.
# Be aware that if you are missing these lines from your profile, tab completion
# for `choco` will not function.
# See https://ch0.co/tab-completion for details.
$ChocolateyProfile = "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
if (Test-Path($ChocolateyProfile)) {
    Import-Module "$ChocolateyProfile"
}

# Remove useless ugly beep
Set-PSReadlineOption -BellStyle None

# Close terminal on EOF
Set-PSReadlineKeyHandler -Chord 'Ctrl+D' -ScriptBlock { Stop-Process -Id $PID }
