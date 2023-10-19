def clone [url: string] {
    git clone --recursive $url
}

def exp [path: string = "."] {
    explorer $path
}

def cat [file: string ] {
   open $file | lines
}
