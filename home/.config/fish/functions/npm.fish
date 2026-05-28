function __nr_complete
    cat package.json 2>/dev/null | jq -r ".scripts? | keys? | .[]"
end

complete --command nr --no-files --arguments '(__nr_complete)'

function nr
    BROWSER=none npm run $argv
end

function __nu_complete
    cat package.json 2>/dev/null | jq -r '((.dependencies? // {}) + (.devDependencies? // {})) | keys | .[]'
end

complete --command nu --no-files --arguments '(__nu_complete)'

function nu
    set -l pkg $argv[1]
    set -l save_flag --save
    if jq -e --arg p $pkg '.devDependencies? | has($p)' package.json >/dev/null 2>&1
        set save_flag --save-dev
    end
    npm install $save_flag $pkg"@latest"
end

function nid --wraps "npm install"
    npm install --save-dev $argv
end

function ni --wraps "npm install"
    npm install --save $argv
end
