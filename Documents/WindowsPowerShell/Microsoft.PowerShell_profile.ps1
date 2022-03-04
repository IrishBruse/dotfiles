# Modules
$ENV:EDITOR = "code"
$ENV:VISUAL = "code"

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
