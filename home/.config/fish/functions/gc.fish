function gc
    if test (count $argv) -eq 0
        git commit
    else if test (count $argv) -eq 1; and not string match -q '--*' -- $argv[1]
        git commit -m $argv[1]
    else
        git commit $argv
    end
end
