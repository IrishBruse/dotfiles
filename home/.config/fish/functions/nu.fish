function __nu_complete
    cat package.json 2>/dev/null | jq -r ".dependencies? | keys? | .[]"
end

complete --command nu --no-files --arguments '(__nu_complete)'

function nu
    npm install --save $argv[1]"@latest"
end
