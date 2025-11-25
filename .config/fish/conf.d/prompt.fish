function fish_prompt
    set -l exit_code $status

    if not set -e transient_prompt
        printf (prompt_pwd --full-length-dirs=20)

        if test $exit_code -ne 0
            printf (set_color red)" $exit_code "(set_color normal)
        end

        printf '\n'
    end

    if test $exit_code -eq 0
        # printf (set_color blue)'❯'
        printf (set_color blue)'❯'
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
