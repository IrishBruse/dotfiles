function apc
    if test (uname) = Linux
        sudo chown -R $(whoami) /usr/share/code/
    else
        sudo chown -R $(whoami) '/Applications/Visual Studio Code.app/Contents/'
    end
end
