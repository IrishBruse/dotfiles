function fish_prompt
    set -l exit_code $status

    # printf \e\[0J # clear from cursor to end of screen

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

function transient_prompt_func
    echo -e -n (set_color purple)"❯ " # print prompt
end

function fish_right_prompt
    printf (set_color green)(echo $fish_node_version)(set_color normal)
end
