function prompt {
    Write-Host "$pwd " -NoNewline

    # Print -> arrow pompt
    $Host.UI.Write($([char]0x2192))
    return " "
}

$win = "C:\Windows\system32"

if ($pwd.path.equals($win))
{
    cd "A:/"
}
else
{
    cd $pwd
}

# Custom Functions

function clone { git clone --recursive $args }

function $ { powershell -Command $args }

function echo { Write-Host $args }

function ls        { Get-ChildItem $args -name }
function pwd       { Get-Location }
function cls       { clear }
function clear     { Clear-Host }

function copy      { Copy-Item -Path $args[0] -Destination $args[1] }
function cp        { copy $args}

function choco     { sudo choco $args}

function grep      { rg $args }

function edit      {
    if($args.Count -eq 0){
        code .
    }else{
        code $args
    }
}

function open      {
    if($args.Count -eq 0){
        explorer .
    }else{
        explorer $args
    }
}

function ..        { cd .. }
