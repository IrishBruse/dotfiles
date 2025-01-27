#!/usr/bin/env fish

if test (uname) = Linux
    dconf dump / >dconf-settings.ini
end

if test (uname) = Darwin
    echo \n\n"== Casks =="\n\n >brew.ini
    brew list --casks >>brew.ini

    echo \n\n"== Formula =="\n\n >>brew.ini
    brew list --formula >>brew.ini
end

set SNIPPETS .config/Code/User/snippets

set jsSnippets (jq -s '.[0] * {"AUTO": {"description":"GENERATED"}}' $SNIPPETS/node.json)
echo $jsSnippets | jq >$SNIPPETS/javascript.json
echo $jsSnippets | jq >$SNIPPETS/typescript.json

set jsReactSnippets (jq -s ".[0] * $jsSnippets" $SNIPPETS/react.json)
echo $jsReactSnippets | jq >$SNIPPETS/javascriptreact.json
echo $jsReactSnippets | jq >$SNIPPETS/typescriptreact.json
