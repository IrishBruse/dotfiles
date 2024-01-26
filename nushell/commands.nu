def clone [url: string] {
    ^git clone --recursive $url
}

def exp [path: string = "."] {
    ^explorer $path
}

def cat [file: string ] {
   open $file --raw | nu-highlight
}

def term [] {
    ^wezterm-gui.exe
}

def --wrapped ldtkgen [...args:string] {
    ^dotnet "A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll" ...$args
}

def --wrapped git [...args:string] {
    if ($args | length) == 0 {
        lazygit
    } else {
        ^git ...$args
    }
}

def title [title: string] {
    run-external cmd "/c" "title" ($title)
}

# Git shortcuts

def --wrapped gstat [...args:string] {
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
