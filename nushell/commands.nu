def clone [url: string] {
    git clone --recursive $url
}

def exp [path: string = "."] {
    explorer $path
}

def cat [file: string ] {
   open $file | lines
}

def --wrapped ldtkgen [...args:string] {
    dotnet "A:/LDtkMonogame/LDtk.Codegen/bin/Debug/net6.0/LDtk.Codegen.dll" ...$args
}
