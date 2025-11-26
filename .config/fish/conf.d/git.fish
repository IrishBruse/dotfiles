abbr gs "git status"
abbr ga "git add ."
abbr clone "git clone --recursive"

function gc
    if test (count $argv) -gt 0
        git commit -m "$argv"
    else
        git commit
    end
end
