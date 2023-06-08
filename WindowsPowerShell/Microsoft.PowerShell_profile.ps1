Import-Module "A:\dotfiles\WindowsPowerShell\ferium.psm1" -Force
Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"

# PowerShell parameter completion shim for the dotnet CLI
Register-ArgumentCompleter -Native -CommandName dotnet -ScriptBlock {
    param($commandName, $wordToComplete, $cursorPosition)
    dotnet complete --position $cursorPosition "$wordToComplete" | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}

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

function clone          { git clone --recursive $args }

function echo           { Write-Host $args }

function ..             { Set-Location .. }
function ls             { Get-ChildItem $args -name }
function pwd            { Get-Location }
function cls            { Clear-Host }
function clear          { Clear-Host }

function copy           { Copy-Item -Path $args[0] -Destination $args[1] }
function cp             { Copy-Item $args }

function installed      { choco.exe list -li }
function choco          { sudo choco $args }
function update         { sudo choco upgrade all }

function grep           { rg $args }

function dot            { code A:/dotfiles/ }
function term           { alacritty --hold -e powershell -Command "$args" }

function ldtkgen        { dotnet "A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll" $args }

function open {
    if ($args.Count -eq 0) {
        explorer .
    }
    else {
        explorer $args
    }
}

function touch {
    $item = $args[0]

    if ($item[-1] -eq '/' -or $item[-1] -eq '\\') {
        New-Item "$item\\" -ItemType directory
    }
    else {
        New-Item $item -ItemType file
    }
}
