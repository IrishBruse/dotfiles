function fish_prompt
    set -l exit_code $status

    printf \e\[0J # clear from cursor to end of screen

    if not set -e transient_prompt
        printf (set_color blue)(prompt_pwd --full-length-dirs=20)(set_color normal)

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
    if test $TERM_PROGRAM = vscode
        printf ""
    else
        printf (set_color normal)(fish_git_prompt)" "
    end
end

function fish_right_prompt_loading_indicator
    printf (set_color normal)
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

    if test $TERM_PROGRAM = vscode
        echo $fish_command
    else
        echo (prompt_pwd --full-length-dirs=100) $fish_command
    end

    echo $test
end

bind \r maybe_execute
