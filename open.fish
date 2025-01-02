#!/usr/bin/env fish

git stash && git pull --rebase && git stash pop

if test (uname) = Linux
    dconf dump / >dconf-settings.ini
end

if test (uname) = Darwin
    brew list >brew.ini
end

set SNIPPETS .config/Code/User/snippets

set jsSnippets (jq -s '.[0] * {"AUTO": {"description":"GENERATED"}}' $SNIPPETS/node.json)
echo $jsSnippets | jq >$SNIPPETS/javascript.json
echo $jsSnippets | jq >$SNIPPETS/typescript.json

set jsReactSnippets (jq -s ".[0] * $jsSnippets" $SNIPPETS/react.json)
echo $jsReactSnippets | jq >$SNIPPETS/javascriptreact.json
echo $jsReactSnippets | jq >$SNIPPETS/typescriptreact.json
