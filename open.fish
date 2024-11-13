#!/usr/bin/env fish

if test (uname) = Linux
    uname
    dconf dump / >dconf-settings.ini
end

if test (uname) = Darwin
    uname
    brew list >brew.ini
end

cp .config/Code/User/snippets/typescript.json .config/Code/User/snippets/javascript.json
cp .config/Code/User/snippets/typescriptreact.json .config/Code/User/snippets/javascriptreact.json

sed -i '2 i \ \ "AUTO": { "description": "GENERATED", "body": "" },' '/home/econn/.config/Code/User/snippets/javascriptreact.json'
sed -i '2 i \ \ "AUTO": { "description": "GENERATED", "body": "" },' '/home/econn/.config/Code/User/snippets/javascript.json'
