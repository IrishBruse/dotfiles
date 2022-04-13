# Modules
$ENV:EDITOR = "code"
$ENV:VISUAL = "code"

function prompt {
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

$ui = (Get-Host).UI.RawUI
If (Test-IsAdmin) {
    $ui.WindowTitle = "Administrator PowerShell - $pwd"
}
else {
    $ui.WindowTitle = "PowerShell - $pwd"
}

# Remove useless ugly beep
Set-PSReadlineOption -BellStyle None

# Close terminal on EOF
Set-PSReadlineKeyHandler -Chord 'Ctrl+D' -ScriptBlock { Stop-Process -Id $PID }
