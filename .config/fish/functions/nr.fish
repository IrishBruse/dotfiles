function __nr_complete
    cat package.json 2>/dev/null | jq -r ".scripts? | keys? | .[]"
end

complete --command nr --no-files --arguments '(__nr_complete)'

function nr
    BROWSER=none npm run $argv
end
