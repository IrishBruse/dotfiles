Import-Module "A:\dotfiles\WindowsPowerShell\ferium.psm1" -Force

Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete

function prompt {
    $branch = git branch
    if ($branch) {
        $branch = $branch -replace '^\*\s+'
        $branch = " ($branch)"
    }

    # specify your custom prompt, e.g. the default PowerShell:
    "$($executionContext.SessionState.Path.CurrentLocation)$($branch) $([char]0x2192) "
}

# Custom Functions

function clone { git clone --recursive $args }

function echo      { Write-Host $args }

function ..        { cd .. }
function ls        { Get-ChildItem $args -name }
function pwd       { Get-Location }
function cls       { clear }
function clear     { Clear-Host }

function copy      { Copy-Item -Path $args[0] -Destination $args[1] }
function cp        { copy $args}

function installed { choco.exe list -li }
function choco     { sudo choco $args}
function update    { sudo choco upgrade all }

function grep      { rg $args }

function ldtkgen   { dotnet A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll $args }

function edit {
    if($args.Count -eq 0){
        code .
    }else{
        code $args
    }
}

function open {
    if($args.Count -eq 0){
        explorer .
    }else{
        explorer $args
    }
}

function touch {
    $item = $args[0]

    if($item[-1] -eq '/' -or $item[-1] -eq '\\'){
        New-Item "$item\\" -ItemType directory
    }else{
        New-Item $item -ItemType file
    }
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
