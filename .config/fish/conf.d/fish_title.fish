function fish_title
    set -q argv[1]; or set argv $fish_last_command

    if test fish_last_command != ""
        set -g fish_last_command $argv[1]
    end

    echo (fish_prompt_pwd_dir_length=15 prompt_pwd) $argv
end
