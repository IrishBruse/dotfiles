function fish_prompt
    set -l exit_code $status

    if not set -e transient_prompt
        printf (set_color cyan)(prompt_pwd --full-length-dirs=20)

        set -l ms $CMD_DURATION
        set -l dur_str
        if test $ms -lt 1000
            set dur_str "$ms"ms
        else if test $ms -lt 10000
            set dur_str (math -s1 "$ms / 1000")s
        else
            set dur_str (math -s0 "$ms / 1000")s
        end
        printf (set_color brblack)" %s"(set_color normal) $dur_str

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
