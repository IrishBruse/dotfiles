source A:/dotfiles/nushell/completions/git.nu
source A:/dotfiles/nushell/completions/npm.nu
source A:/dotfiles/nushell/completions/yarn.nu
source A:/dotfiles/nushell/completions/dotnet.nu

let external_completer = { |spans|
    {
        dotnet: { ||
            dotnet complete (
                $spans | skip 1 | str join " "
            ) | lines | sort
        },
        winget: { ||
            winget complete --word (
                $spans | get (($spans | length ) - 1)
            ) --position 1000 --commandline (
                $spans | str join " "
            ) | lines
        }
    } | get $spans.0 | each { || do $in }
}
