function prompt {
    Write-Host "$pwd " -NoNewline

    # Print -> arrow pompt
    $Host.UI.Write($([char]0x2192))
    return " "
}

# Remove useless ugly beep
Set-PSReadlineOption -BellStyle None

# Close terminal on EOF
Set-PSReadlineKeyHandler -Chord 'Ctrl+D' -ScriptBlock { Stop-Process -Id $PID }

# Custom Functions

# git
function clone { git clone --recursive "$args" }

# chezmoi
function config { chezmoi "$args" }
function editconfig { $path = chezmoi source-path ; code $path  }

# winget
function install { winget install --accept-package-agreements --accept-source-agreements -silent -s winget "$args" }
function search { winget search -s winget "$args" }
function update { winget upgrade --all }

# custom builtin
function $ { powershell -Command "$args" } # Ignore $

function echo { Write-Host "$args" }

function cd {
    if (Test-Path $args) {
        Set-Location $args[0]
    }else{
        Write-Host "No folder $pwd$args found"
    }
}

function ls     { Get-ChildItem "$args" -name }
function pwd    { Get-Location }
function clear  { Clear-Host }
function cls    { Clear-Host }

function copy   { Copy-Item -Path $args[0] -Destination $args[1] }
function cp     { Copy-Item -Path $args[0] -Destination $args[1] }

function ..     { cd .. }

$ChocolateyProfile = "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
if (Test-Path($ChocolateyProfile)) {
  Import-Module "$ChocolateyProfile"
}
