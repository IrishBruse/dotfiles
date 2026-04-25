function __agent_complete_or_fzf_ref
    set -l tok (commandline -ct)
    set -l cl (commandline -opc)
    set -l cmd $cl[1]

    # Trigger fzf only for @refs in agent prompt contexts.
    if string match -qr '^@' -- $tok; and test (count $cl) -ge 1; and contains -- $cmd agent a ac ap aa
        set -l query (string sub -s 2 -- $tok)
        set -l selected

        if command -sq fd
            set selected (fd --type f --hidden --follow --exclude .git . | fzf --query "$query" --select-1 --exit-0)
        else
            set selected (rg --files -uu -g '!.git' | fzf --query "$query" --select-1 --exit-0)
        end

        if test -n "$selected"
            commandline -rt "@$selected"
            commandline -f repaint
            return
        end
    end

    commandline -f complete
end
