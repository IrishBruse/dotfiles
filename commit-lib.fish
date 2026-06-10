function _commit_label -a path
    switch $path
        case AGENTS.md tools/AGENTS.md home/.agents/AGENTS.md
            echo docs
            return
        case '*.fish'
            echo scripts
            return
    end

    if string match -q 'tools/*' -- $path
        set -l part (string split / $path)[2]
        if test -n "$part"
            echo "$part tool"
            return
        end
        echo tools
        return
    end

    if string match -q 'home/.agents/skills/*' -- $path
        echo (string split / $path)[4]" skill"
        return
    end

    if string match -q 'home/.cursor/rules/*' -- $path
        echo cursor rules
        return
    end

    if string match -q 'home/.config/fish/*' -- $path
        echo fish config
        return
    end

    if string match -q 'home/.config/*' -- $path
        echo config
        return
    end

    if string match -q 'home/*' -- $path
        echo home
        return
    end

    if string match -q 'vscode/*' -- $path
        echo vscode
        return
    end

    set -l top (string split / $path)[1]
    if test -n "$top"
        echo $top
    else
        echo dotfiles
    end
end

function _commit_action
    set -l files $argv
    set -l total (count $files)
    if test $total -eq 0
        echo update
        return
    end

    set -l added 0
    set -l deleted 0
    for file in $files
        set -l file_status (git diff --cached --name-status -- $file | head -n 1)
        switch (string split \t $file_status)[1]
            case A '?'
                set added (math $added + 1)
            case D
                set deleted (math $deleted + 1)
        end
    end

    if test $added -eq $total
        echo add
    else if test $deleted -eq $total
        echo remove
    else
        echo update
    end
end

function commit_message -a files
    set -l labels
    for file in $files
        set -l label (_commit_label $file)
        if not contains -- $label $labels
            set -a labels $label
        end
    end

    set -l scope (string join ", " $labels)
    set -l action (_commit_action $files)
    echo "$action $scope"
end
