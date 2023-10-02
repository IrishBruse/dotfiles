def clone [url: string] {
    git clone --recursive $url
}

def open [path: string = "."] {
    explorer $path
}
