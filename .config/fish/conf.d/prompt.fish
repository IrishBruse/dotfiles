function fish_prompt
    set -l exit_code $status

    printf \e\[0J # clear from cursor to end of screen

    if not set -e transient_prompt
        printf (set_color cyan)(prompt_pwd --full-length-dirs=20)(set_color normal)

        if test $exit_code -ne 0
            printf (set_color red)" $exit_code "(set_color normal)
        end

        echo
    end


    if test $exit_code -eq 0
        printf (set_color magenta)'❯'
    else
        printf (set_color red)'❯'
    end
    printf " "(set_color normal)
end

function fish_right_prompt
    printf (set_color green)(echo $fish_node_version)(set_color normal)

    if test "$fish_git_branch" != ""
        printf " "
        printf "("(set_color blue)(echo $fish_git_branch)(set_color normal)")"
    end
end

function maybe_execute

    set -g fish_first_prompt 1

    commandline --is-valid

    # If commandline is complete (i.e pressing enter will produce a new prompt)
    if test $status -ne 2
        set -g transient_prompt
        commandline -f repaint
    end

    commandline -f execute
end

function fish_title
    if test (commandline -pc) != ""
        set -gx fish_command (commandline -pc | string shorten --max 20)
    end

    echo $fish_command
end

bind \r maybe_execute
