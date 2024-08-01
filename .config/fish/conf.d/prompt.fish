function fish_prompt
    printf \e\[0J # clear from cursor to end of screen

    if set -q fish_first_prompt
        # echo
    end

    if not set -e transient_prompt
        echo (set_color blue)(prompt_pwd --full-length-dirs=2 --dir-length=3)(set_color normal)
    end

    # if $last_status != 0
    #     echo (set_color red)'❯ '
    # else
    # end
    echo (set_color magenta)'❯ '
end

function maybe_execute
    set -g fish_first_prompt 1

    commandline --is-valid

    # If commandline is complete (i.e pressing enter will produce a new prompt)
    if test $status != 2
        set -g transient_prompt
        commandline -f repaint
    end

    commandline -f execute
end

bind \r maybe_execute
