function __nu_complete
    cat package.json 2>/dev/null | jq -r '((.dependencies? // {}) + (.devDependencies? // {})) | keys | .[]'
end

complete --command nu --no-files --arguments '(__nu_complete)'
