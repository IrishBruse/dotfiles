function prompt {
    Write-Host "$pwd " -NoNewline

    # Print -> arrow pompt
    $Host.UI.Write($([char]0x2192))
    return " "
}

$win = "C:\Windows\System32"

if ($pwd.path.equals($win))
{
    cd "A:/"
}
else
{
    cd $pwd
}

# Custom Functions

# git
function clone { git clone --recursive $args }

# custom builtin
function $ { powershell -Command $args } # Ignore $

function echo { Write-Host $args }

function ls     { Get-ChildItem $args -name }
function pwd    { Get-Location }
function cls    { clear }
function clear  { Clear-Host }

function copy   { Copy-Item -Path $args[0] -Destination $args[1] }
function cp     { copy $args}

function choco     { sudo choco $args}

function ..     { cd .. }

$ChocolateyProfile = "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
if (Test-Path($ChocolateyProfile)) {
  Import-Module "$ChocolateyProfile"
}
