function fish_prompt
    if test "$NO_PROMPT" = true
        printf '❯ '
        return
    end

    set -l exit_code $status


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

function fish_title
    if test (commandline -pc) = ""
        return
    end

    echo fish_command (commandline -pc | string shorten --max 20)
end
