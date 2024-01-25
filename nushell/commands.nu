def clone [url: string] {
    ^git clone --recursive $url
}

def exp [path: string = "."] {
    explorer $path
}

def cat [file: string ] {
   open $file --raw | nu-highlight
}

def term [] {
    wezterm
}

def --wrapped ldtkgen [...args:string] {
    dotnet "A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll" ...$args
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
