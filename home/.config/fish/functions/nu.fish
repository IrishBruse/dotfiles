function nu
    set -l pkg $argv[1]
    set -l save_flag --save
    if jq -e --arg p $pkg '.devDependencies? | has($p)' package.json >/dev/null 2>&1
        set save_flag --save-dev
    end
    npm install $save_flag $pkg"@latest" $argv[2..]
end
