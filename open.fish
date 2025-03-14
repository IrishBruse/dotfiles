#!/usr/bin/env fish

if test (uname) = Linux
    dconf dump / >misc/dconf-settings.ini
    dconf read /com/linuxmint/install/installed-apps | string replace -a \' \" | jq >misc/apt.json
end

if test (uname) = Darwin
    echo \n\n"== Casks =="\n\n >misc/brew.ini
    brew list --casks >>misc/brew.ini

    echo \n\n"== Formula =="\n\n >>misc/brew.ini
    brew list --formula >>misc/brew.ini
end

set SNIPPETS .config/Code/User/snippets

set jsSnippets (jq -s '.[0] * {"AUTO": {"description":"GENERATED"}}' $SNIPPETS/node.json)
echo $jsSnippets | jq >$SNIPPETS/javascript.json
echo $jsSnippets | jq >$SNIPPETS/typescript.json

set jsReactSnippets (jq -s ".[0] * $jsSnippets" $SNIPPETS/react.json)
echo $jsReactSnippets | jq >$SNIPPETS/javascriptreact.json
echo $jsReactSnippets | jq >$SNIPPETS/typescriptreact.json
