function fish_title
    set -q argv[1]; or set argv $fish_last_command

    if test fish_last_command != ""
        set -g fish_last_command $argv[1]
    end

    set -l cmd (string sub -l 20 -- (string join ' ' -- $argv))

    echo $cmd
end
