# Git shortcuts

def --wrapped gst [...args:string] {
    ^git status ...$args
}

def --wrapped gs [...args:string] {
    ^git stash ...$args
}

def --wrapped gsp [...args:string] {
    ^git stash pop ...$args
}

def --wrapped ga [...args:string] {
    ^git add ...$args
}

def --wrapped gp [...args:string] {
    ^git pull ...$args
}

def clone [url: string] {
    ^git clone --recursive $url
}

# General shortcuts

def e [path: string = "."] {
    ^explorer $path
}

def c [path: string = "."] {
    ^code $path
}

def term [] {
    ^wezterm-gui.exe
}

def cat [file: string ] {
   ^bat $file
}

def --wrapped ldtkgen [...args:string] {
    ^dotnet "A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll" ...$args
}

def --wrapped git [...args:string] {
    if ($args | length) == 0 {
        ^lazygit
    } else {
        ^git ...$args
    }
}

def serve [port:int = 42069] {
    dotnet serve -o -p $port
}

def title [...args: string] {
    run-external cmd /c title ...$args
}

def displayTitle [] {
    let command = commandline
    let cwd = pwd | str replace --all (char path_sep) "/"
    let sep = -

    title $command $sep $cwd
}

def startTitle [before:any,after:any] {
    if ($before|describe) == nothing {
        let cwd = pwd | str replace --all (char path_sep) "/"
        title Nushell - $cwd
    }
}

def --env onChangePWD [old:any,new:any] {

    let git_command = do { ^git branch --show-current } | complete
    let git_branch  = if ($git_command.exit_code == 0) {
        ($git_command.stdout | str join)
    } else {
        ""
    }

    $env.nu_git_branch = $git_branch
}
